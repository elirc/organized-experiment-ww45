# Guided Reading Path

There are thirteen stops. Each one ends with a **Check** you can answer with the file open. The heaviest file is `src/repositories/knowledgeEntryRepository.ts` (425 lines). Read it after you understand the auth layers.

## Step 1: `src/app/page.tsx`
**Why read this:** It is the server-side entry to search.
**What to look for:** `getServerSession()`, then `redirect("/login")` when there is no session, then `<SearchDashboard session=...>` (`:6-21`). The session's `expiresAt` is serialized to an ISO string before crossing to the client.
**What to trace:** `src/lib/auth/session.ts:30-39` and `src/components/knowledge/search-dashboard.tsx`.
**What a junior would likely miss:** The page loads no search data. Everything after the session check happens in the client through React Query.
**Check:** List the other pages that use the same redirect pattern. Answer: `workspace/page.tsx:9-11`, which also redirects viewers at `:13-15`, and `entries/[slug]/page.tsx:21-23`.

## Step 2: `src/lib/auth/session.ts`
**Why read this:** It turns a cookie into a trusted user.
**What to look for:** Token creation (`:20-22`), expiry (`:24-28`), and `getSessionFromToken`, which deletes expired rows (`:41-64`).
**What to trace:** `findSessionByToken` and `invalidateSessionByToken` (`src/repositories/sessionRepository.ts:13-33`).
**What a junior would likely miss:** The cookie value is the raw database key. There is no hashing, so a database leak equals a session leak.
**Check:** Find what `getSessionFromToken` returns for an expired session, and what it does as a side effect. Answer: `null`, and it deletes the row (`:48-52`).

## Step 3: `src/lib/auth/apiAuth.ts`
**Why read this:** It holds the route guards.
**What to look for:** `requireApiSession` returns 401 (`:19-33`). `requireApiRole` adds the 403 threshold (`:35-44`).
**What to trace:** All knowledge routes and `/api/me`. `/api/tags` uses neither.
**What a junior would likely miss:** The guards resolve the session through `request.cookies`, while pages use `next/headers`. They are two readers of one cookie.
**Check:** Count the routes that call `requireApiRole`. Answer: the knowledge `POST`, `[entryId]` `GET` and `PATCH`, status, curation, and workspace routes, which is six handlers.

## Step 4: `src/lib/auth/permissions.ts`
**Why read this:** It is the actual policy.
**What to look for:** `roleOrder` (`:20-24`), `canEditEntry` (`:42-48`), `canReadEntryInWorkspace` (`:50-60`), `canTransitionEntry` (`:62-76`), and `isValidStatusTransition` (`:78-91`).
**What to trace:** `src/services/knowledgeEntryService.ts:13` imports six of these helpers.
**What a junior would likely miss:** `isValidStatusTransition` returns `true` for same-status moves (`:79-81`). Re-publishing an already-published entry resets `publishedAt`.
**Check:** Find the helper that is defined but never called. Answer: `canAccessWorkspace` (`:30-32`).

## Step 5: `src/lib/validation/knowledgeEntrySchemas.ts`
**Why read this:** It defines the request contracts.
**What to look for:** The slug transform and refine (`:45-54`), the `manualBoost` cap (`:63`), and `featuredOnly: z.coerce.boolean()` (`:26`).
**What to trace:** The search, knowledge, status, curation, and workspace routes.
**What a junior would likely miss:** `z.coerce.boolean()` turns the string `"false"` into `true`.
**Check:** Find the field with no maximum length. Answer: `content` (`:42`).

## Step 6: `src/app/api/knowledge/search/route.ts`
**Why read this:** It is the cleanest read-only route.
**What to look for:** Auth first (`:21`), then manual extraction of the query string into the schema (`:23-29`), then the service.
**What to trace:** `searchKnowledgeBase` and `searchPublishedEntries`.
**What a junior would likely miss:** `getAll("tags")` supports repeated parameters. A comma-separated value would be treated as one slug.
**Check:** Name the error code for `?page=0`. Answer: 400 `INVALID_REQUEST` (`min(1)`, `knowledgeEntrySchemas.ts:27`).

## Step 7: `src/services/knowledgeEntryService.ts`
**Why read this:** It holds every entry rule.
**What to look for:**
- `createDraftEntry` (`:83-119`);
- `updateDraftEntry` (`:121-161`). Note that it has no status check;
- `changeEntryStatus` (`:163-195`);
- `curateEntry` (`:197-232`).
**What to trace:** Repository writes and `createAuditLog`, which always receives the `transaction` client.
**What a junior would likely miss:** Uniqueness pre-checks run **outside** the transaction (`:88`, `:132`).
**Check:** Find the action strings written to `AuditLog`. Answer: `knowledgeEntry.created`, `.updated`, `.statusChanged`, and `.curated`.

## Step 8: `src/repositories/knowledgeEntryRepository.ts`
**Why read this:** It has both Prisma CRUD and raw SQL.
**What to look for:** Three scoped finders (`:34-105`), `listWorkspaceEntries` (`:116-156`), `searchPublishedEntries` (`:158-264`), and `mapWorkspaceEntry` (`:404-425`).
**What to trace:** Callers are only in `knowledgeEntryService.ts`.
**What a junior would likely miss:** The ranking document in SQL includes tag names. The GIN index in the migration does not, so the index cannot serve this query.
**Check:** Compute the score of a featured entry with boost 5 and no text query. Answer: `0 + 1.5 + 0.75 = 2.25` (`:244-248`).

## Step 9: `src/components/knowledge/search-dashboard.tsx`
**Why read this:** It is a thin search UI.
**What to look for:** Filter state, tag chips toggling slugs (`:66-82`), and result links (`:140`).
**What to trace:** `useKnowledgeSearch` and `useTags`.
**Check:** Explain why tag chips use `tag.slug` rather than `tag.name`. Answer: the SQL filters on `Tag.slug` (`knowledgeEntryRepository.ts:170`).

## Step 10: `src/hooks/useKnowledgeSearch.ts`
**Why read this:** It bridges UI state and the API.
**What to look for:** Conditional parameters (`:17-28`) and the query key (`:31`).
**Check:** Explain what makes the cache key change when a tag is toggled. Answer: the `filters` object, including the `tags` array, is part of the key.

## Step 11: `src/components/knowledge/workspace-dashboard.tsx`
**Why read this:** It runs many mutations without holding server policy.
**What to look for:** The create/update branch (`:115-120`), status buttons (`:185-232`), and the admin-only curation form (`:275`).
**What a junior would likely miss:** The Publish button condition (`status !== "PUBLISHED"`) also matches `ARCHIVED`, which the server rejects.
**Check:** Find the button an admin sees only on archived entries. Answer: the restore-to-draft button (`:225-232`).

## Step 12: `prisma/schema.prisma` and `prisma/migrations/.../migration.sql`
**Why read this:** They are the persistence contract.
**What to look for:** `EntryStatus`, `UserRole`, the curation fields on `KnowledgeEntry`, and the unique `Tag.name` and `Tag.slug`. In the migration, the GIN index (`:112-120`).
**What a junior would likely miss:** `db:push` would skip the hand-written GIN index.
**Check:** Find the `onDelete` behavior that prevents deleting an author. Answer: `onDelete: Restrict` on `KnowledgeEntry.author` (`schema.prisma:74`).

## Step 13: `prisma/seed.ts`
**Why read this:** It shows the intended runtime shape.
**What to look for:** Three users (`:7-38`), five tags (`:41-46`), two published entries by the editor, and one draft by the admin with `manualBoost: 1` (`:139-141`).
**Check:** Explain why re-running the seed does not duplicate rows. Answer: every write is an `upsert` keyed by email or slug.
