# Architecture Overview

Knowledge Hub is a single-organization knowledge base. It has explicit database-backed sessions, threshold RBAC with per-author ownership, ranked full-text search, and an editorial workflow. Request boundaries, business rules, and data access live in separate folders so each can be reviewed on its own.

## Top-level folders

- **`prisma/`** holds three things:
  - `schema.prisma`: 6 models and 2 enums;
  - `migrations/20260416000000_initial_schema/migration.sql`: the initial migration, which also creates the hand-written GIN index `KnowledgeEntry_search_idx` (`:112-120`);
  - `seed.ts`: 3 users, 5 tags, 3 entries, all upserted.
- **`src/app/`**:
  - Pages: `page.tsx` (search), `workspace/page.tsx`, `entries/[slug]/page.tsx`, `login/page.tsx`. Each page calls `getServerSession()` and redirects when it returns null.
  - API: 10 route files under `src/app/api/`. Every handler is a `try { ... } catch (error) { return apiError(error); }` (`src/lib/http/responses.ts:10-47`).
- **`src/lib/`**:
  - `auth/`: `session.ts` (token, expiry, lookup), `apiAuth.ts` (route guards), `permissions.ts` (roles, ownership, transitions), `password.ts` (bcrypt), `types.ts`;
  - `validation/`: Zod schemas;
  - `http/`: `responses.ts` (server envelope `{ data }` / `{ error: { code, message } }`) and `client.ts` (browser `apiClient`, which unwraps `data`);
  - `env.ts`, `errors.ts`, `db.ts`, `utils.ts` (`slugify`, `dedupe`, `cn`).
- **`src/services/`**: `knowledgeEntryService.ts` holds all entry rules and transactions. `authService.ts` handles login and logout. `tagService.ts` lists tags.
- **`src/repositories/`**: `knowledgeEntryRepository.ts` (CRUD plus raw-SQL search), `tagRepository.ts`, `auditLogRepository.ts`, `sessionRepository.ts`, `userRepository.ts`. The write functions take a `client: DbLike` (`PrismaClient | Prisma.TransactionClient`), so services can pass a transaction.
- **`src/hooks/`** has six React Query hooks. **`src/components/`** holds the two dashboards, the header, the login form, and UI primitives.
- **`src/tests/`** has four Vitest files.
- **`docs2/`, `docs3/`** are additional story-based curricula. They are not covered by this revision.

## Layer order for a write

```
client hook -> route handler -> requireApiRole (cookie -> Session row -> role threshold)
  -> Zod parse -> service (ownership/state checks) -> db.$transaction(repo writes + audit log)
  -> mapWorkspaceEntry -> apiOk({ data })
```

Every mutating route authenticates **before** it parses the body. For example, `src/app/api/knowledge/route.ts:20-21` calls `requireApiRole` on line 20 and `parse` on line 21. Unauthenticated callers never reach validation.

## Walkthrough: editor saves an existing entry

1. `PATCH /api/knowledge/:entryId` (`src/app/api/knowledge/[entryId]/route.ts:27-39`) runs `requireApiRole(request, "EDITOR")`, then `saveKnowledgeEntrySchema.parse`, which normalizes the slug from the slug field or the title (`src/lib/validation/knowledgeEntrySchemas.ts:37-54`), then `updateDraftEntry`.
2. `updateDraftEntry` (`src/services/knowledgeEntryService.ts:121-161`):
   - loads the entry with `findEditableEntryById`, which scopes by `authorId` for non-admins (`src/repositories/knowledgeEntryRepository.ts:85-105`), and returns 404 if nothing comes back;
   - checks `canEditEntry` (`:128-130`);
   - checks the slug is unique, excluding this entry (`:132-136`);
   - opens a transaction that upserts tags, replaces tag joins with `deleteMany` plus `create` (`knowledgeEntryRepository.ts:322-325`), and writes the `knowledgeEntry.updated` audit row.
3. The response is `apiOk(mapWorkspaceEntry(...))`, a `200 { data: WorkspaceEntry }`.

Despite its name, `updateDraftEntry` never checks `status`. An editor can rewrite the content of an entry that is already **published**, and the change is live in search immediately, with no re-review. See `docs/architecture/auth-and-permissions.md`.

## The design choice that matters most

Ranking, permissions, and transitions are decided on the server:
- the ranking formula lives in SQL (`knowledgeEntryRepository.ts:244-248`);
- transitions live in `isValidStatusTransition` and `canTransitionEntry`;
- ownership lives in both the repository `where` clauses and the service guards.

The workspace UI only decides which buttons to show, and it gets one of those decisions wrong (Publish is shown on archived entries; see `docs/learning/flow-traces.md`).

## Exercises

1. **Goal:** Confirm that every write route authenticates before validation.
   **Check:** In each of `src/app/api/knowledge/route.ts`, `[entryId]/route.ts`, `[entryId]/status/route.ts`, and `[entryId]/curation/route.ts`, the `requireApiRole` call is on an earlier line than the `.parse` call.
2. **Goal:** Find the one API route that needs no session at all, apart from login and logout.
   **Check:** `src/app/api/tags/route.ts:4-11` calls `listAvailableTags()` directly. Every tag name, including tags used only on drafts, is visible to anonymous callers.
3. **Goal:** Explain why the migration is hand-edited.
   **Check:** Compare `prisma/schema.prisma` (no search index) with `migration.sql:112-120`, which defines a GIN index on a `to_tsvector` expression. Prisma's schema language cannot declare expression indexes, so `prisma db push` (also available as `npm run db:push`) would **not** create it. Only `migrate dev` or `migrate deploy` would.
