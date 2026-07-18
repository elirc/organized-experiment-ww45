# Stories 31-35: Capstone Senior/Staff-Level Features

## Story 31: Add Saved Searches
**Difficulty:** Expert
**Estimated Time:** 14+ hours
**Skills You'll Practice:** new domain modeling, user-owned data, API design, React Query writes, UI workflows
**The Story:** As a signed-in user, I want to save search filters so that I can return to important knowledge views quickly.

**Acceptance Criteria:**
- [ ] Users can save current `query`, `tags`, and `featuredOnly`.
- [ ] Users can list their own saved searches.
- [ ] Users can apply a saved search to the search dashboard.
- [ ] Users can delete only their own saved searches.
- [ ] API ownership is enforced server-side.

**Files You'll Likely Touch:**
- `prisma/schema.prisma`: add a `SavedSearch` model related to `User` from `prisma/schema.prisma:30-44`.
- `src/lib/auth/apiAuth.ts`: use `requireApiSession()` from `src/lib/auth/apiAuth.ts:19-33`.
- `src/components/knowledge/search-dashboard.tsx`: filter state lives in `src/components/knowledge/search-dashboard.tsx:14-26`.
- `src/hooks/useKnowledgeSearch.ts`: query params are built in `src/hooks/useKnowledgeSearch.ts:14-33`.
- New repository/service/API/hook files.

**Pair Programming Implementation Plan:**
1. Model `SavedSearch` with `id`, `userId`, `name`, `query`, `featuredOnly`, `tagSlugs Json` or normalized relation. Prefer JSON array for first version because saved filters are user preferences, not core search taxonomy.
2. Add indexes for `userId` and maybe `[userId, name]`.
3. Create validation schema: name length, query max matching `src/lib/validation/knowledgeEntrySchemas.ts:23-29`, tag slugs array, featuredOnly boolean.
4. Add repository functions: create, list by user, delete by user. Every query includes `userId`.
5. Add service functions that accept `SessionUser`; routes should never pass arbitrary user IDs from clients.
6. Add API routes under `src/app/api/saved-searches`.
7. Add hooks: `useSavedSearches`, `useCreateSavedSearchMutation`, `useDeleteSavedSearchMutation`.
8. Add UI in search controls to save current filters, list saved searches, apply one, delete one.
9. On apply, set `query`, `selectedTags`, and `featuredOnly` in `SearchDashboard`.
10. Add tests for ownership and validation.

**Tests To Consider:**
- Repository test that delete includes `userId`.
- API test that unauthenticated request gets 401.
- Validation test for too-long query/name.

**Senior Review Questions:**
- Should tag slugs be JSON or normalized? JSON is simpler; normalized is more queryable.
- What happens if a tag slug is later deleted?
- Does applying saved search mutate server state? It should not.

**What Could Go Wrong:**
- Delete endpoint deletes by saved search id only and allows cross-user deletion.
- Saved searches reuse `tags` display names instead of slugs, breaking `useKnowledgeSearch()` which appends slugs in `src/hooks/useKnowledgeSearch.ts:28`.

**Stretch Goal:** Allow one saved search to be marked default.

## Story 32: Add Entry Revision History
**Difficulty:** Expert
**Estimated Time:** 18+ hours
**Skills You'll Practice:** audit architecture, revision modeling, transactions, historical reads
**The Story:** As an editor, I want to view previous versions of an entry so that I can recover from bad edits.

**Acceptance Criteria:**
- [ ] Updating an entry writes a revision snapshot.
- [ ] Editors can view revisions for entries they can edit.
- [ ] Admins can view all revisions.
- [ ] Public viewers cannot view revisions.
- [ ] Revision creation is transactional with entry update.

**Files You'll Likely Touch:**
- `prisma/schema.prisma`: add `KnowledgeEntryRevision` related to `KnowledgeEntry` in `prisma/schema.prisma:58-82`.
- `src/services/knowledgeEntryService.ts`: update transaction is in `src/services/knowledgeEntryService.ts:138-160`.
- `src/repositories/knowledgeEntryRepository.ts`: editable lookup and update live in `src/repositories/knowledgeEntryRepository.ts:85-104` and `src/repositories/knowledgeEntryRepository.ts:304-340`.
- `src/lib/auth/permissions.ts`: edit/read rules are in `src/lib/auth/permissions.ts:42-60`.
- `src/components/knowledge/workspace-dashboard.tsx`: editor surface is in `src/components/knowledge/workspace-dashboard.tsx:73-466`.

**Pair Programming Implementation Plan:**
1. Design `KnowledgeEntryRevision` with snapshot fields: entryId, version, title, slug, summary, content, tag names or tag ids, actorId, createdAt.
2. Decide when to snapshot: before update or after update. Prefer before update if recovery target is previous state.
3. Add repository function `createKnowledgeEntryRevision(transaction, snapshot)`.
4. In `updateDraftEntry()`, after loading `currentEntry` and before `updateKnowledgeEntry()`, create revision in the same `db.$transaction`.
5. Add list revisions repository/service/API route requiring editor role and `canReadEntryInWorkspace()` or `canEditEntry()` depending on product intent.
6. Add hook and UI panel in workspace for selected entry revisions.
7. Add "view revision" read-only content preview.
8. Add tests for revision created transactionally and permission scoping.

**Tests To Consider:**
- Service test that update calls revision creation before update.
- Repository test that non-admin revision list is scoped.
- API test that viewer cannot access revisions.

**Senior Review Questions:**
- Should revisions include tags as names, ids, or both?
- What is the retention policy?
- How does this differ from `AuditLog` in `prisma/schema.prisma:104-119`?

**What Could Go Wrong:**
- Revisions are written outside the update transaction and drift from actual edits.
- Revision endpoint leaks draft content to viewers.

**Stretch Goal:** Add "restore from revision" as a separate explicit workflow.

## Story 33: Add Role Management For Admins
**Difficulty:** Expert
**Estimated Time:** 16+ hours
**Skills You'll Practice:** high-risk admin flows, authorization, self-lockout prevention, user repository design
**The Story:** As an admin, I want to change user roles so that team access can be managed without database edits.

**Acceptance Criteria:**
- [ ] Admins can list users.
- [ ] Admins can change a user's role.
- [ ] Non-admins cannot access role management APIs.
- [ ] Admin cannot accidentally remove the last admin.
- [ ] Role changes are audit logged.

**Files You'll Likely Touch:**
- `prisma/schema.prisma`: `UserRole` and `User` are in `prisma/schema.prisma:18-44`.
- `src/repositories/userRepository.ts`: current user lookups are in `src/repositories/userRepository.ts:3-13`.
- `src/lib/auth/permissions.ts`: role order is in `src/lib/auth/permissions.ts:20-27`.
- `src/repositories/auditLogRepository.ts`: audit create is in `src/repositories/auditLogRepository.ts:16-20`.
- `src/lib/auth/apiAuth.ts`: admin route guard is in `src/lib/auth/apiAuth.ts:35-43`.

**Pair Programming Implementation Plan:**
1. Add repository functions: list users, find user by id, update user role, count admins.
2. Add service `changeUserRole(actor, targetUserId, nextRole)`.
3. Enforce actor must be admin even though route also guards.
4. Prevent last-admin removal: if target is admin and next role is not admin, count current admins first.
5. Use a transaction for role update plus audit log.
6. Add validation schema for `nextRole`.
7. Add admin-only API routes under `src/app/api/users`.
8. Add UI. Choose either a workspace admin panel or separate `/admin/users` route.
9. Invalidate session/user queries after role changes if current user is affected.
10. Add tests for non-admin rejection and last-admin protection.

**Tests To Consider:**
- Service test for last admin cannot be demoted.
- API test editor receives 403.
- Repository test update shape if using mocks.

**Senior Review Questions:**
- What happens to active sessions after role change? Current sessions resolve user role from session include in `src/repositories/sessionRepository.ts:13-26`, so future requests see updated role.
- Should users be able to change their own role?
- How will audit logs show previous and next role?

**What Could Go Wrong:**
- Admin demotes last admin and no one can manage roles.
- UI hides role management but API lacks admin guard.

**Stretch Goal:** Add "impersonation forbidden" tests if future admin support tooling appears.

## Story 34: Add Search Analytics
**Difficulty:** Expert
**Estimated Time:** 20+ hours
**Skills You'll Practice:** event modeling, privacy review, write volume management, analytics design
**The Story:** As a product owner, I want to know what users search for and when searches return no results so that I can improve the knowledge base.

**Acceptance Criteria:**
- [ ] Search requests can record query, tags, featuredOnly, result count, and user id.
- [ ] Analytics do not store sensitive entry content.
- [ ] Analytics write does not block search response noticeably.
- [ ] Admins can view common no-result searches.
- [ ] Tests cover analytics persistence shape.

**Files You'll Likely Touch:**
- `src/app/api/knowledge/search/route.ts`: search request flow is in `src/app/api/knowledge/search/route.ts:18-36`.
- `src/services/knowledgeEntryService.ts`: search service is in `src/services/knowledgeEntryService.ts:39-47`.
- `src/repositories/knowledgeEntryRepository.ts`: search result count returns in `src/repositories/knowledgeEntryRepository.ts:256-263`.
- `prisma/schema.prisma`: add analytics model.
- `src/lib/auth/session.ts`: session user is shaped in `src/lib/auth/session.ts:54-63`.

**Pair Programming Implementation Plan:**
1. Add `SearchEvent` model with userId nullable or required depending on authenticated-only assumption. Search route requires session, so required userId is fine.
2. Fields: query, tagSlugs JSON, featuredOnly, resultCount, createdAt.
3. Add repository create function. Keep it small and failure-contained.
4. In search route, keep session result instead of discarding it. Current code does `await requireApiSession(request)` in `src/app/api/knowledge/search/route.ts:20-21`.
5. After `searchKnowledgeBase(parsedQuery)` returns, record analytics. Decide whether to `await` it. For correctness in this app, await and catch/log failures separately so analytics failure does not fail search.
6. Add admin analytics endpoint for no-result searches grouped by query/tag combination.
7. Add admin UI in workspace or separate analytics page.
8. Add tests for analytics record creation and route resilience.

**Tests To Consider:**
- Service or route test that search still returns if analytics write fails.
- Repository test for no-result aggregation.

**Senior Review Questions:**
- Is the query text sensitive? Internal searches can reveal incidents or customers.
- Do you need retention limits?
- Should analytics be sampled or async queued at scale?

**What Could Go Wrong:**
- Analytics write failure takes down search.
- Analytics stores raw sensitive content or too much metadata.

**Stretch Goal:** Add a daily rollup table instead of querying raw events.

## Story 35: Add Knowledge Quality Review Workflow
**Difficulty:** Expert
**Estimated Time:** 24+ hours
**Skills You'll Practice:** workflow design, state machines, permissions, domain refactoring, long-term ownership
**The Story:** As an admin, I want entries to go through a quality review workflow before publication so that important knowledge stays accurate.

**Acceptance Criteria:**
- [ ] New status or review state supports "needs review".
- [ ] Editors can submit drafts for review.
- [ ] Admins can approve for publication or request changes.
- [ ] Status transition rules are centralized.
- [ ] Audit logs capture review actions.
- [ ] UI clearly separates editing, submission, approval, and change-request states.

**Files You'll Likely Touch:**
- `prisma/schema.prisma`: `EntryStatus` is in `prisma/schema.prisma:24-28`.
- `src/lib/auth/permissions.ts`: transition matrix is in `src/lib/auth/permissions.ts:78-90`.
- `src/services/knowledgeEntryService.ts`: status change service is in `src/services/knowledgeEntryService.ts:163-194`.
- `src/app/api/knowledge/[entryId]/status/route.ts`: status endpoint is in `src/app/api/knowledge/[entryId]/status/route.ts:24-34`.
- `src/components/knowledge/workspace-dashboard.tsx`: publish/archive/restore buttons are in `src/components/knowledge/workspace-dashboard.tsx:183-243`.
- `src/tests/services/knowledge-entry-status.test.ts`: current transition test is in `src/tests/services/knowledge-entry-status.test.ts:24-49`.

**Pair Programming Implementation Plan:**
1. Decide model: extend `EntryStatus` with `IN_REVIEW` and `CHANGES_REQUESTED`, or add separate `reviewStatus`. For this app, extending `EntryStatus` is simpler but affects every status switch.
2. Update Prisma enum and migrate.
3. Update `statusTone()` in `src/components/knowledge/workspace-dashboard.tsx:39-49`.
4. Update validation: `changeEntryStatusSchema` uses `z.nativeEnum(EntryStatus)` in `src/lib/validation/knowledgeEntrySchemas.ts:56-58`, so it will accept new enum values automatically after Prisma generation.
5. Rewrite `allowedTransitions` in `src/lib/auth/permissions.ts:83-87`:
   - `DRAFT -> IN_REVIEW | ARCHIVED`
   - `IN_REVIEW -> PUBLISHED | CHANGES_REQUESTED | ARCHIVED`
   - `CHANGES_REQUESTED -> IN_REVIEW | ARCHIVED`
   - `PUBLISHED -> ARCHIVED`
   - `ARCHIVED -> DRAFT` admin-only
6. Update `canTransitionEntry()` if some transitions require admin approval.
7. Update workspace buttons to show submit/request changes/approve actions based on role and status.
8. Update `changeEntryStatus()` audit metadata in `src/services/knowledgeEntryService.ts:181-191` to include review actions.
9. Update tests for valid and invalid transitions.
10. Review public search: it already filters `PUBLISHED` in `src/repositories/knowledgeEntryRepository.ts:216`, so in-review entries stay hidden.

**Tests To Consider:**
- Editor can submit `DRAFT -> IN_REVIEW`.
- Editor cannot approve `IN_REVIEW -> PUBLISHED` if product says admin-only.
- Admin can request changes.
- Published entries cannot go directly to draft.
- Search excludes `IN_REVIEW`.

**Senior Review Questions:**
- Is review workflow a status or a separate state dimension?
- Does adding statuses break any UI assumptions about three statuses in `src/components/knowledge/workspace-dashboard.tsx:384-408`?
- Are audit logs enough, or do review comments need their own model?

**What Could Go Wrong:**
- UI hardcodes only `DRAFT`, `PUBLISHED`, `ARCHIVED` and new statuses disappear from filters.
- Transition matrix allows editors to publish without review.
- Public search accidentally includes in-review entries if status filter changes.

**Stretch Goal:** Add reviewer comments and assignment.

