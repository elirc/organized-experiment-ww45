# Load-Bearing Files

These are the files where a small mistake leaks drafts, hands out admin powers, or corrupts search. For each one: who calls it (checked by import search), what breaks, a likely junior mistake, and one current weakness with a line reference.

## `src/services/knowledgeEntryService.ts` (232 lines)

- **What it does:** It holds every entry use case: search pass-through, published read, workspace read and list, create, update, status change, and curation. Every write runs inside `db.$transaction` together with an audit row.
- **What calls it:** the knowledge API routes (search, root, `[entryId]`, status, curation, workspace) and `src/app/entries/[slug]/page.tsx` (`getPublishedEntryBySlug`).
- **What it calls:** `knowledgeEntryRepository`, `tagRepository`, `auditLogRepository`, and six helpers from `permissions.ts`.
- **What breaks if wrong:** Editors could mutate entries they do not own, invalid transitions could slip through, or audit rows could commit separately from the change they describe.
- **Likely junior mistake:** Splitting policy across routes and services.
- **Current weakness:** `updateDraftEntry` (`:121-161`) never checks `status`, so published content can be edited in place. Slug uniqueness is checked outside the transaction (`:88`, `:132`).

## `src/repositories/knowledgeEntryRepository.ts` (425 lines)

- **What it does:** It provides scoped finders, the workspace list, ranked search SQL, the writes, and `mapWorkspaceEntry`.
- **What calls it:** `knowledgeEntryService.ts` and `src/tests/repositories/workspace-scope.test.ts`.
- **What it calls:** `src/lib/db.ts`.
- **What breaks if wrong:**
  - If the `authorId` clause at `:119` or `:89` disappears, drafts leak between editors.
  - If `entry."status" = 'PUBLISHED'` (`:216`) disappears, drafts appear in search for everyone, viewers included.
- **Likely junior mistake:** Building SQL with string concatenation. This file uses `Prisma.sql` and `Prisma.join` throughout.
- **Current weakness:** The search expression does not match the GIN index (`:220-229` vs `migration.sql:112-120`).

## `src/lib/auth/permissions.ts` (91 lines)

- **What it does:** It defines the role thresholds, ownership predicates, and the transition matrix.
- **What calls it:** `apiAuth.ts` (`hasMinimumRole`) and `knowledgeEntryService.ts`.
- **What it calls:** Prisma enums only.
- **What breaks if wrong:** RBAC and the workflow drift everywhere at once.
- **Likely junior mistake:** Checking the role without checking ownership.
- **Current weakness:** Same-status transitions are "valid" (`:79-81`). `canAccessWorkspace` is dead code (`:30-32`).

## `src/lib/auth/session.ts` (74 lines) and `src/lib/auth/apiAuth.ts` (44 lines)

- **What they do:** They turn a token into an `AuthSession` (pages and APIs), expire stale sessions, and enforce 401 and 403.
- **What calls them:** the four pages (via `getServerSession`), `apiAuth.ts`, and `authService.ts` (token and expiry helpers).
- **What breaks if wrong:** Deleted or expired sessions keep working, or 401 and 403 get conflated.
- **Current weakness:** Tokens are stored unhashed (`sessionRepository.ts:3-11`).

## `src/lib/validation/knowledgeEntrySchemas.ts` (71 lines)

- **What it does:** It defines the search, workspace, save, status, and curation contracts.
- **What calls it:** five route files, plus `src/tests/validation/knowledge-entry-schema.test.ts` and type imports in hooks and the service.
- **What it calls:** `slugify` (`src/lib/utils.ts:8-14`).
- **What breaks if wrong:** Uncapped boosts would swamp text relevance. Blank slugs would create unreachable entries.
- **Current weakness:** `featuredOnly: z.coerce.boolean()` (`:26`) parses `"false"` as `true`. `content` has no maximum length (`:42`).

## `src/repositories/tagRepository.ts` (37 lines)

- **What it does:** It lists tags and upserts tags from names during saves.
- **What calls it:** `knowledgeEntryService.ts` (upsert) and `tagService.ts` (list).
- **What breaks if wrong:** Tags get duplicated or renamed for every entry that uses them.
- **Current weakness:** It de-duplicates by name rather than slug (`:15`). On a conflict it overwrites `name` (`:24`).

## `src/app/api/knowledge/[entryId]/curation/route.ts` (37 lines)

- **What it does:** It is the admin-only boundary for ranking control.
- **What calls it:** `useCurateEntryMutation` (`src/hooks/useEntryMutations.ts:70`) and `src/tests/api/knowledge-curation-route.test.ts`.
- **What it calls:** `requireApiRole("ADMIN")`, `curateEntrySchema`, and `curateEntry`.
- **What breaks if wrong:** Editors could reorder public search.
- **Likely junior mistake:** Hiding the form in the UI and skipping the server check. The UI does hide it (`workspace-dashboard.tsx:275`), and the server checks twice.

## `src/components/knowledge/workspace-dashboard.tsx`

- **What it does:** It drives create, edit, publish, archive, restore, and curate.
- **What calls it:** `src/app/workspace/page.tsx:17-23`.
- **What it calls:** `useWorkspaceEntries`, `useWorkspaceEntry`, and `useEntryMutations`.
- **What breaks if wrong:** Nothing security-relevant, because the server re-checks everything. It can still offer impossible actions.
- **Current weakness:** It shows Publish on archived entries (`:185`).

## `prisma/schema.prisma` and the initial migration

- **What they do:** The persistence contract, plus the one hand-written index.
- **What calls them:** `prisma generate`, `migrate dev`, `db push`, and the seed.
- **What breaks if wrong:** Search, RBAC, and audit lose the fields they depend on.
- **Current weakness:** `npm run db:push` would build a database without `KnowledgeEntry_search_idx`.

## Exercises

1. **Goal:** Verify the caller lists.
   **Check:** Search `src/` for each module path. For example, `@/services/knowledgeEntryService` should appear in six route files and one page.
2. **Goal:** Choose the single most dangerous line deletion.
   **Check:** Compare `knowledgeEntryRepository.ts:216` (drafts become publicly searchable), `:119` (editors see each other's drafts in the list), and `curation/route.ts:27` (editors can still not curate, because `curateEntry` re-checks at `knowledgeEntryService.ts:198-200`). The third is the least dangerous.
