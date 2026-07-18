# Flow Traces

## Flow: Ranked search from the home page
1. `src/app/page.tsx` — server page calls `getServerSession()` and renders `SearchDashboard`.
2. `src/components/knowledge/search-dashboard.tsx` — local filter state calls `useKnowledgeSearch()`.
3. `src/hooks/useKnowledgeSearch.ts` — builds `URLSearchParams` and calls `apiClient()` with `GET /api/knowledge/search`.
4. `src/app/api/knowledge/search/route.ts` — `GET()` runs `requireApiSession()` and `searchEntriesQuerySchema.parse()`.
5. `src/lib/auth/apiAuth.ts` — `requireApiSession()` resolves the session cookie through `getSessionFromToken()`.
6. `src/services/knowledgeEntryService.ts` — `searchKnowledgeBase()` maps request filters into the repository contract.
7. `src/repositories/knowledgeEntryRepository.ts` — `searchPublishedEntries()` runs the full-text query and computes `score`.
8. Returns `{ data: { items, totalCount } }`, which React Query stores and `SearchDashboard` renders.

## Flow: Editor creates a new draft
1. `src/components/knowledge/workspace-dashboard.tsx` — `WorkspaceEditorPanel` submits the create form and calls `useCreateEntryMutation()`.
2. `src/hooks/useEntryMutations.ts` — `useCreateEntryMutation()` posts to `/api/knowledge`.
3. `src/app/api/knowledge/route.ts` — `POST()` calls `requireApiRole(request, "EDITOR")` and `saveKnowledgeEntrySchema.parse()`.
4. `src/services/knowledgeEntryService.ts` — `createDraftEntry()` checks `canCreateEntry()`, verifies slug uniqueness, and opens `db.$transaction(...)`.
5. `src/repositories/tagRepository.ts` — `upsertTagsByNames()` normalizes tag names and ensures tag rows exist.
6. `src/repositories/knowledgeEntryRepository.ts` — `createKnowledgeEntry()` inserts the draft and join rows.
7. `src/repositories/auditLogRepository.ts` — `createAuditLog()` writes `knowledgeEntry.created` inside the same transaction.
8. Returns `{ data: WorkspaceEntry }`, and `useCreateEntryMutation()` invalidates workspace and search caches.

## Flow: Editor publishes a draft
1. `src/components/knowledge/workspace-dashboard.tsx` — the Publish button calls `useChangeEntryStatusMutation()`.
2. `src/hooks/useEntryMutations.ts` — `useChangeEntryStatusMutation()` posts `{ status: "PUBLISHED" }` to `/api/knowledge/[entryId]/status`.
3. `src/app/api/knowledge/[entryId]/status/route.ts` — `POST()` calls `requireApiRole()` and `changeEntryStatusSchema.parse()`.
4. `src/services/knowledgeEntryService.ts` — `changeEntryStatus()` loads the current entry with `findEditableEntryById()`, checks `isValidStatusTransition()`, then checks `canTransitionEntry()`.
5. `src/lib/auth/permissions.ts` — `isValidStatusTransition()` and `canTransitionEntry()` enforce workflow rules and ownership.
6. `src/repositories/knowledgeEntryRepository.ts` — `updateKnowledgeEntryStatus()` writes the new status and `publishedAt`.
7. `src/repositories/auditLogRepository.ts` — `createAuditLog()` records `knowledgeEntry.statusChanged`.
8. Returns `{ data: WorkspaceEntry }`, and the mutation invalidates workspace/detail/search caches.

## Flow: Unauthorized curation rejection
1. `src/components/knowledge/workspace-dashboard.tsx` — an editor could attempt the curation endpoint if a client bug exposed the control.
2. `src/hooks/useEntryMutations.ts` — `useCurateEntryMutation()` posts to `/api/knowledge/[entryId]/curation`.
3. `src/app/api/knowledge/[entryId]/curation/route.ts` — `POST()` immediately calls `requireApiRole(request, "ADMIN")`.
4. `src/lib/auth/apiAuth.ts` — `requireApiRole()` loads the session and compares the minimum role with `hasMinimumRole()`.
5. `src/lib/auth/permissions.ts` — `hasMinimumRole()` evaluates the role threshold.
6. `src/lib/http/responses.ts` — `apiError()` converts `AuthorizationError` into a `403` response payload.
7. Returns `{ error: { code: "FORBIDDEN", message: ... } }`.

## Flow: Repository ownership isolation in the workspace
1. `src/app/api/knowledge/workspace/route.ts` — `GET()` accepts optional status filters for workspace listings.
2. `src/services/knowledgeEntryService.ts` — `listWorkspaceKnowledgeEntries()` checks `canCreateEntry()` and passes actor context into the repository.
3. `src/repositories/knowledgeEntryRepository.ts` — `listWorkspaceEntries()` builds a `where` clause with `authorId: input.actorId` for non-admin users.
4. `src/lib/db.ts` — Prisma executes `knowledgeEntry.findMany()` and `knowledgeEntry.count()` with that scoped filter.
5. Returns `{ data: { items, totalCount } }`, limited to entries the editor owns unless the actor is an admin.
