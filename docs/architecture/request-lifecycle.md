# Request Lifecycle

Request: Search published knowledge entries with a query and tag filter
1. `src/app/api/knowledge/search/route.ts` — `GET()` reads `q`, `tags`, and pagination values from `request.nextUrl.searchParams`.
2. `src/lib/auth/apiAuth.ts` — `requireApiSession()` verifies the session cookie before any search work runs.
3. `src/lib/validation/knowledgeEntrySchemas.ts` — `searchEntriesQuerySchema.parse()` validates and normalizes query inputs.
4. `src/services/knowledgeEntryService.ts` — `searchKnowledgeBase()` translates the parsed request into the service contract.
5. `src/repositories/knowledgeEntryRepository.ts` — `searchPublishedEntries()` executes the PostgreSQL full-text ranking query with featured and manual boost weighting.
6. Returns `200` with `{ data: { items: SearchResultEntry[], totalCount: number } }`.

Request: Create a new draft from the workspace
1. `src/app/api/knowledge/route.ts` — `POST()` accepts the JSON body for a draft mutation.
2. `src/lib/auth/apiAuth.ts` — `requireApiRole(request, "EDITOR")` rejects viewers before parsing or writing data.
3. `src/lib/validation/knowledgeEntrySchemas.ts` — `saveKnowledgeEntrySchema.parse()` validates title, slug, summary, content, and tag array shape.
4. `src/services/knowledgeEntryService.ts` — `createDraftEntry()` checks slug conflicts, starts a transaction, and owns the mutation policy.
5. `src/repositories/tagRepository.ts` — `upsertTagsByNames()` normalizes and upserts tag rows for the submitted names.
6. `src/repositories/knowledgeEntryRepository.ts` — `createKnowledgeEntry()` inserts the draft and join-table tag assignments.
7. `src/repositories/auditLogRepository.ts` — `createAuditLog()` records the create event inside the same transaction.
8. Returns `201` with `{ data: WorkspaceEntry }`.

Request: Publish an editor-owned draft
1. `src/app/api/knowledge/[entryId]/status/route.ts` — `POST()` receives the target status for the selected entry.
2. `src/lib/auth/apiAuth.ts` — `requireApiRole(request, "EDITOR")` ensures only editors/admins can attempt workflow changes.
3. `src/lib/validation/knowledgeEntrySchemas.ts` — `changeEntryStatusSchema.parse()` validates the requested enum value.
4. `src/services/knowledgeEntryService.ts` — `changeEntryStatus()` loads the current entry, checks `isValidStatusTransition()` and `canTransitionEntry()`, then opens a transaction.
5. `src/repositories/knowledgeEntryRepository.ts` — `updateKnowledgeEntryStatus()` updates `status` and `publishedAt`.
6. `src/repositories/auditLogRepository.ts` — `createAuditLog()` records the previous and next status.
7. Returns `200` with `{ data: WorkspaceEntry }`.

Request: Editor attempts to access admin-only curation
1. `src/app/api/knowledge/[entryId]/curation/route.ts` — `POST()` receives the curation request.
2. `src/lib/auth/apiAuth.ts` — `requireApiRole(request, "ADMIN")` loads the session and compares the role threshold.
3. `src/lib/http/responses.ts` — `apiError()` converts the thrown `AuthorizationError` into the HTTP response body.
4. Returns `403` with `{ error: { code: "FORBIDDEN", message: "You do not have access to this resource" } }`.
