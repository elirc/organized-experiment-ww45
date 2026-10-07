# Testing Rationale

`npm test` runs `vitest run --coverage` (`package.json`). Vitest uses a Node environment with globals, `@` aliased to `src`, and V8 coverage that reports `text` and `json-summary` (`vitest.config.ts`). There are four test files under `src/tests/`, with one test each. Two mock a module boundary, one partially mocks a repository, and one is pure. None needs a database. This document does not report run results.

## 1. `src/tests/api/knowledge-curation-route.test.ts`: "returns 403 when a non-admin hits the curation endpoint"

**How it works:** It `vi.mock`s `@/lib/auth/apiAuth` so that `requireApiRole` rejects with `AuthorizationError` (`:5-10`, `:26`), and stubs `curateEntry` (`:12-14`). It imports the real route and calls `POST` with a `Request` cast `as never`, plus `params` (`:28-39`). It asserts status 403 (`:41`).

**What it proves:** The route turns an `AuthorizationError` from the guard into 403 through `apiError`. It also proves the guard runs before `curateEntry`, though only implicitly: the test does not assert that `curateEntryMock` was never called.

**What it does not prove:** That the route asks for `"ADMIN"`. The mock rejects no matter which role is requested, so changing `:27` to `requireApiRole(request, "EDITOR")` would still pass. Adding `expect(requireApiRoleMock).toHaveBeenCalledWith(expect.anything(), "ADMIN")` would close that gap.

## 2. `src/tests/validation/knowledge-entry-schema.test.ts`: "rejects a malformed knowledge entry payload"

**How it works:** It parses `{ title: "Bad", slug: "x", summary: "too short", content: "tiny", tags: [] }` and expects a throw (`:10-19`).

**What it proves:** At least one rule fails. All five fields here are invalid.

**What it does not prove:** Which rule failed. It also does not cover the slug-derivation path (empty slug falls back to the title), tag whitespace normalization, or the `featuredOnly` coercion bug in the search schema.

## 3. `src/tests/services/knowledge-entry-status.test.ts`: "rejects an invalid published-to-draft transition"

**How it works:** It partially mocks the repository so that `findEditableEntryById` returns a `PUBLISHED` entry owned by `editor-1` (`:8-17`, `:28-34`). It calls the **real** `changeEntryStatus` with `DRAFT` and expects `ConflictError` (`:38-49`).

**What it proves:** The service consults `isValidStatusTransition` before any write. It throws before reaching `db.$transaction`, and the real `db` is never touched.

**What it does not prove:**
- Allowed transitions.
- Admin restore.
- The 403 branch (`canTransitionEntry`).
- The audit write.

## 4. `src/tests/repositories/workspace-scope.test.ts`: "scopes non-admin workspace queries to the actor's own entries"

**How it works:** It mocks `db.knowledgeEntry.findMany` and `count` (`:6-13`), calls `listWorkspaceEntries` as `EDITOR` (`:29-35`), and asserts that `findMany` received `where` containing `authorId: "editor-1"` (`:37-43`).

**What it proves:** The shape of the list query's ownership filter.

**What it does not prove:**
- That `count` uses the same `where`. It does at `:149`, but nothing asserts it.
- That admins are unscoped.
- That `findEditableEntryById` and `findWorkspaceEntryById` are scoped, even though those are the paths that guard mutations and the detail view.

## Defects no test would catch

| Defect | Location | Test that would catch it |
| --- | --- | --- |
| `featuredOnly=false` parsed as true | `src/lib/validation/knowledgeEntrySchemas.ts:26` | `searchEntriesQuerySchema.parse({ featuredOnly: "false" }).featuredOnly === false` |
| Editors edit published entries | `src/services/knowledgeEntryService.ts:121-161` | Service test: PATCH on a `PUBLISHED` entry as `EDITOR` expects 409 (once the rule exists) |
| Tag rename on case change | `src/repositories/tagRepository.ts:24` | Integration test: save "SECURITY" and assert the original tag name is unchanged |
| Same-status transition resets `publishedAt` | `src/lib/auth/permissions.ts:79-81` | Service test asserting that `PUBLISHED -> PUBLISHED` is a no-op |
| Publish button on archived entries | `src/components/knowledge/workspace-dashboard.tsx:185` | Component test |
| Search does not use the GIN index | `src/repositories/knowledgeEntryRepository.ts:220-229` | `EXPLAIN` against a seeded database (not a unit test) |

## Exercises

1. **Goal:** Make test 1 role-sensitive on paper.
   **Check:** Add an assertion on `requireApiRoleMock.mock.calls[0][1]`, then change the route's role argument and confirm the new assertion fails.
2. **Goal:** Write the cheapest missing test.
   **Check:** It is the `featuredOnly` schema case. It is pure, needs no mocks, and documents a real bug.
