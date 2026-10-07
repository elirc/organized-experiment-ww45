# Request Lifecycle

Four requests traced from handler to database. Every API handler uses the same `try/catch` into `apiError()` (`src/lib/http/responses.ts:10-47`):
- `AppError` subclasses become `{ error: { code, message } }` with their own status: 401 `AUTHENTICATION_REQUIRED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `CONFLICT` (`src/lib/errors.ts:22-50`);
- `ZodError` becomes 400 `INVALID_REQUEST` with `issues: error.flatten()` (`:23-34`);
- anything else is logged and becomes 500 `INTERNAL_SERVER_ERROR`.

Successful responses are `{ data }` (`apiOk`, `:6-8`). The browser `apiClient` returns `payload.data` and throws `new Error(payload.error.message)` on non-2xx (`src/lib/http/client.ts:13-19`).

---

## Request 1: Search published entries with a query and a tag filter

`GET /api/knowledge/search?q=vpn&tags=security&page=1&pageSize=10`

1. `src/app/api/knowledge/search/route.ts:18-37`: `requireApiSession(request)` runs **first** (`:21`), so anonymous requests never reach SQL.
2. `searchEntriesQuerySchema.parse({...})` (`:23-29`; schema at `src/lib/validation/knowledgeEntrySchemas.ts:23-29`):
   - `q` is trimmed, at most 120 characters, default `""`;
   - `tags` comes from `getAll("tags")`;
   - `page` and `pageSize` are coerced to integers, with `pageSize` at most 50.
3. `searchKnowledgeBase` (`src/services/knowledgeEntryService.ts:39-47`) renames the fields for the repository and adds no logic.
4. `searchPublishedEntries` (`src/repositories/knowledgeEntryRepository.ts:158-264`) builds one `Prisma.sql` statement:
   - The tag filter is an `EXISTS` sub-select on `Tag.slug IN (...)`, using `Prisma.join` for safe parameter expansion (`:160-172`). Multiple tags are OR-ed: an entry matches if it has **any** of them.
   - `featuredOnly` adds `entry."isFeatured" = TRUE` (`:174`).
   - A CTE groups each published entry with its author and tags. When `q` is non-empty, it computes `ts_rank_cd(weighted tsvector, websearch_to_tsquery('english', q))` (`:198-208`) and filters with `HAVING ... @@ websearch_to_tsquery(...)` (`:220-229`).
   - The outer select computes `score = textRank + (isFeatured ? 1.5 : 0) + manualBoost x 0.15` (`:244-248`) and `COUNT(*) OVER()` for the total. It orders by score, then `publishedAt`, then `updatedAt`.
   - Every user value (`q`, tag slugs, limit, offset) is a bound parameter, and nothing is string-concatenated.
5. The response is **200** `{ data: { items, totalCount } }`. Each `score` is converted from `numeric` to `Number`, and `totalCount` from `bigint` (`:256-263`).

**Validation gap:** `featuredOnly: z.coerce.boolean()` (`knowledgeEntrySchemas.ts:26`) uses JavaScript truthiness, so `?featuredOnly=false` becomes **`true`**. The UI never sends `false`. It only appends the parameter when the filter is on (`src/hooks/useKnowledgeSearch.ts:21-23`). Any other client that sends `featuredOnly=false` gets featured-only results.

---

## Request 2: Create a draft from the workspace

`POST /api/knowledge` with `{ title, slug?, summary, content, tags[] }`

1. `src/app/api/knowledge/route.ts:18-29`: `requireApiRole(request, "EDITOR")` (`:20`), then `saveKnowledgeEntrySchema.parse` (`:21`).
2. The schema (`knowledgeEntrySchemas.ts:37-54`) enforces:
   - title 5-120 characters;
   - summary 20-240 characters;
   - content at least 40 characters (with **no** maximum);
   - 1-6 tags of 2-40 characters each, with internal whitespace collapsed (`:16-21`).

   Its `.transform` sets `slug = slugify(slug || title)`, and `.refine` requires at least 3 characters.
3. `createDraftEntry` (`knowledgeEntryService.ts:83-119`):
   - checks `canCreateEntry` (`:84-86`);
   - checks slug uniqueness (`:88-92`, returning **409**);
   - inside `db.$transaction`, runs `upsertTagsByNames` (`src/repositories/tagRepository.ts:14-37`), then `createKnowledgeEntry` with nested join rows (`knowledgeEntryRepository.ts:266-302`), then the `knowledgeEntry.created` audit row with `{ slug, status }`.
4. The response is **201** `{ data: WorkspaceEntry }`.

---

## Request 3: Publish an editor-owned draft

`POST /api/knowledge/:entryId/status` with `{ status: "PUBLISHED" }`

1. `src/app/api/knowledge/[entryId]/status/route.ts:24-35`: `requireApiRole("EDITOR")`, then `changeEntryStatusSchema.parse` (any `EntryStatus`).
2. `changeEntryStatus` (`knowledgeEntryService.ts:163-195`):
   - `findEditableEntryById`, author-scoped for editors; missing gives **404** (`:164-168`);
   - `isValidStatusTransition(current, next)`; invalid gives **409** (`:170-172`);
   - `canTransitionEntry(actor, entry, next)`; denied gives **403** (`:174-176`). That function re-checks `canEditEntry`, requires admin for `ARCHIVED` to `DRAFT`, and then re-runs the transition matrix (`src/lib/auth/permissions.ts:62-76`);
   - in a transaction, `updateKnowledgeEntryStatus` (sets `publishedAt`, `knowledgeEntryRepository.ts:343-368`) and the `knowledgeEntry.statusChanged` audit row with `{ previousStatus, nextStatus }`.
3. The response is **200** `{ data: WorkspaceEntry }`.

The 409-before-403 order means an editor asking for an *invalid* transition learns that it is invalid, even when they would also lack permission. That is harmless here, because both checks only apply to entries the editor already owns.

---

## Request 4: An editor attempts admin-only curation

`POST /api/knowledge/:entryId/curation` as an editor

1. `src/app/api/knowledge/[entryId]/curation/route.ts:24-37`: `requireApiRole(request, "ADMIN")` (`:27`).
2. `apiAuth.ts:35-44`: the session resolves, and `hasMinimumRole("EDITOR", "ADMIN")` is false (`permissions.ts:26-28`), so it throws `AuthorizationError`.
3. `apiError` returns **403** `{ error: { code: "FORBIDDEN", message: "You do not have access to this resource" } }`.

The body is never parsed. For an admin, the flow continues: `curateEntrySchema` (`isFeatured`, `manualBoost` integer 0-25, optional notes up to 250 characters), then `curateEntry`, which checks `canCurateEntry`, `findEditableEntryById`, and that the entry is published (**409** otherwise), then updates in a transaction and writes the audit row with `metadata: input` (`knowledgeEntryService.ts:197-232`).

---

## Exercises

1. **Goal:** Prove that the search query is injection-safe.
   **Check:** In `searchPublishedEntries`, every interpolation is either a nested `Prisma.sql` fragment or a value inside `${...}` within a `Prisma.sql` template (`:170`, `:205`, `:227`, `:252-253`). Find any string concatenation. There is none.
2. **Goal:** Find the response for `?pageSize=100`.
   **Check:** `.max(50)` at `knowledgeEntrySchemas.ts:28`, so the result is 400 `INVALID_REQUEST`.
3. **Goal:** Find whether tag filtering is AND or OR.
   **Check:** `tag_filter."slug" IN (...)` inside a single `EXISTS` (`knowledgeEntryRepository.ts:164-171`), so it is OR. To get AND semantics you would need `GROUP BY ... HAVING COUNT(DISTINCT slug) = n`.
