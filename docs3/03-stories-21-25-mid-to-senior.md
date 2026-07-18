# Stories 21-25: Mid-Level To Senior Full-Stack Changes

## Story 21: Add Entry Difficulty Level
**Difficulty:** Hard
**Estimated Time:** 8 hours
**Skills You'll Practice:** Prisma enum design, validation, UI forms, search display, migration planning
**The Story:** As a viewer, I want entries to show a difficulty level so that I can pick knowledge that matches my experience.

**Acceptance Criteria:**
- [ ] Entries support difficulty values such as `BEGINNER`, `INTERMEDIATE`, and `ADVANCED`.
- [ ] Workspace editor can set difficulty.
- [ ] Search cards and public entry pages display difficulty.
- [ ] Existing seed data includes difficulty.
- [ ] Tests cover validation of allowed values.

**Files You'll Likely Touch:**
- `prisma/schema.prisma`: enums and `KnowledgeEntry` fields live in `prisma/schema.prisma:18-82`.
- `prisma/seed.ts`: seed entries are created in `prisma/seed.ts:58-149`.
- `src/lib/validation/knowledgeEntrySchemas.ts`: save schema is in `src/lib/validation/knowledgeEntrySchemas.ts:37-54`.
- `src/types/knowledge.ts`: response types are in `src/types/knowledge.ts:3-34`.
- `src/components/knowledge/workspace-dashboard.tsx`: form state and inputs are in `src/components/knowledge/workspace-dashboard.tsx:23-174`.
- `src/repositories/knowledgeEntryRepository.ts`: create/update/map functions are in `src/repositories/knowledgeEntryRepository.ts:266-425`.

**Pair Programming Implementation Plan:**
1. Add a Prisma enum `EntryDifficulty` near `EntryStatus` in `prisma/schema.prisma:24-28`.
2. Add `difficulty EntryDifficulty @default(BEGINNER)` to `KnowledgeEntry` near workflow fields in `prisma/schema.prisma:58-82`.
3. Run a migration during implementation.
4. Update seed entries in `prisma/seed.ts:58-149`.
5. Extend `saveKnowledgeEntrySchema` with `difficulty: z.nativeEnum(EntryDifficulty)` after importing the enum.
6. Extend `WorkspaceEntry` and `SearchResultEntry` in `src/types/knowledge.ts:3-34`.
7. Include `difficulty` in repository create/update data and `mapWorkspaceEntry()` in `src/repositories/knowledgeEntryRepository.ts:266-425`.
8. Include the column in raw SQL selected rows in `src/repositories/knowledgeEntryRepository.ts:184-253`.
9. Add a select control in workspace form and display badges in search/public pages.
10. Add tests for schema rejection of invalid difficulty.

**Tests To Consider:**
- Extend `src/tests/validation/knowledge-entry-schema.test.ts:5-20`.
- Add a mapping test only if repository mapper becomes independently testable.

**Senior Review Questions:**
- Did raw SQL and Prisma model stay in sync?
- Does the enum add value over a freeform string?
- Is difficulty public metadata or workspace-only metadata? The story says public.

**What Could Go Wrong:**
- Raw SQL in search omits the new field, causing runtime shape mismatch.
- Existing seed data fails migration because difficulty has no default.

**Stretch Goal:** Add a difficulty filter to search.

## Story 22: Add Author Filter To Workspace
**Difficulty:** Hard
**Estimated Time:** 7 hours
**Skills You'll Practice:** scoped query design, role-aware filters, repository authorization
**The Story:** As an admin, I want to filter workspace entries by author so that I can review one editor's work.

**Acceptance Criteria:**
- [ ] Admins can filter workspace entries by author.
- [ ] Editors cannot use author filter to view other editors' drafts.
- [ ] API enforces author scoping independent of UI.
- [ ] Workspace UI only shows the filter to admins.

**Files You'll Likely Touch:**
- `src/components/knowledge/workspace-dashboard.tsx`: selected statuses and query hook are in `src/components/knowledge/workspace-dashboard.tsx:354-365`.
- `src/hooks/useWorkspaceEntries.ts`: serializes status filters in `src/hooks/useWorkspaceEntries.ts:14-22`.
- `src/lib/validation/knowledgeEntrySchemas.ts`: workspace query schema is in `src/lib/validation/knowledgeEntrySchemas.ts:31-35`.
- `src/app/api/knowledge/workspace/route.ts`: parses workspace query in `src/app/api/knowledge/workspace/route.ts:18-31`.
- `src/services/knowledgeEntryService.ts`: list service is in `src/services/knowledgeEntryService.ts:69-80`.
- `src/repositories/knowledgeEntryRepository.ts`: workspace list filter is in `src/repositories/knowledgeEntryRepository.ts:116-156`.

**Pair Programming Implementation Plan:**
1. Extend `WorkspaceEntriesQuery` schema with optional `authorId`.
2. Update `useWorkspaceEntries` to accept an object `{ statuses, authorId }` instead of just statuses. This is a breaking local refactor.
3. In the API route, parse `authorId` from `request.nextUrl.searchParams`.
4. In the service, decide policy: ignore authorId for non-admin or reject it. Prefer rejecting non-admin author filters with `AuthorizationError` so misuse is visible.
5. In repository, apply `authorId` only when actor is admin and input authorId exists. Preserve existing non-admin `{ authorId: input.actorId }` filter in `src/repositories/knowledgeEntryRepository.ts:117-127`.
6. Add an admin-only UI control in the workspace aside.
7. Source author options. For first implementation, derive visible authors from loaded entries; for a complete implementation, add a `/api/users/editors` endpoint.
8. Add tests proving editor author filters cannot escape ownership.

**Tests To Consider:**
- Extend `src/tests/repositories/workspace-scope.test.ts:23-44`.
- Add service test for non-admin author filter rejection.

**Senior Review Questions:**
- Did you protect the repository even if service policy changes later?
- Does deriving author options from current results create an incomplete filter list?
- Should this be admin-only route behavior or reusable permission helper?

**What Could Go Wrong:**
- Editor passes `authorId` in URL and sees another editor's drafts.
- Admin filter and status filter combine incorrectly.

**Stretch Goal:** Add a dedicated authors endpoint for admins.

## Story 23: Add Archive Reason
**Difficulty:** Hard
**Estimated Time:** 8 hours
**Skills You'll Practice:** workflow design, status mutation payloads, audit metadata, nullable persistence
**The Story:** As an editor, I want to provide a reason when archiving an entry so that future maintainers understand why it was removed.

**Acceptance Criteria:**
- [ ] Archiving requires a non-empty reason.
- [ ] Reason is stored on the entry.
- [ ] Reason is included in audit log metadata.
- [ ] Publishing and restoring do not require archive reason.
- [ ] UI prompts for reason only on archive.

**Files You'll Likely Touch:**
- `prisma/schema.prisma`: `KnowledgeEntry` fields live in `prisma/schema.prisma:58-82`.
- `src/lib/validation/knowledgeEntrySchemas.ts`: `changeEntryStatusSchema` is in `src/lib/validation/knowledgeEntrySchemas.ts:56-58`.
- `src/components/knowledge/workspace-dashboard.tsx`: archive button is in `src/components/knowledge/workspace-dashboard.tsx:205-223`.
- `src/hooks/useEntryMutations.ts`: status mutation sends `{ status }` in `src/hooks/useEntryMutations.ts:51-67`.
- `src/app/api/knowledge/[entryId]/status/route.ts`: parses status body in `src/app/api/knowledge/[entryId]/status/route.ts:24-34`.
- `src/services/knowledgeEntryService.ts`: status transition and audit log are in `src/services/knowledgeEntryService.ts:163-194`.
- `src/repositories/knowledgeEntryRepository.ts`: status update function is in `src/repositories/knowledgeEntryRepository.ts:343-368`.

**Pair Programming Implementation Plan:**
1. Add nullable `archiveReason` to `KnowledgeEntry`.
2. Change `changeEntryStatusSchema` to accept `{ status, archiveReason? }` and refine: if status is `ARCHIVED`, reason is required.
3. Update `ChangeEntryStatusInput` automatically from schema inference in `src/lib/validation/knowledgeEntrySchemas.ts:70`.
4. Update `useChangeEntryStatusMutation()` to accept the full input object, not only `EntryStatus`.
5. In UI, add local `archiveReason` state or a small modal/textarea shown before calling archive.
6. Update route to pass both status and reason to service.
7. Update `changeEntryStatus()` signature and set `archiveReason` only when archiving.
8. Add reason to audit metadata beside previous/next status in `src/services/knowledgeEntryService.ts:181-191`.
9. Ensure restoring to draft clears or preserves archive reason deliberately. Prefer preserving for history unless product says otherwise.
10. Add validation and service tests.

**Tests To Consider:**
- Zod test that `ARCHIVED` without reason rejects.
- Service test that publish without reason succeeds.
- Service test that audit metadata includes reason.

**Senior Review Questions:**
- Is archive reason workflow state, audit metadata, or both? This story says both.
- Does the reason belong on the current entry after restore?
- Does requiring reason break existing archive callers?

**What Could Go Wrong:**
- Mutation signature changes but publish/restore buttons still pass strings.
- Backend allows archive without reason because only UI enforced it.

**Stretch Goal:** Show archive reason in workspace metadata for archived entries.

## Story 24: Add Entry Version Number
**Difficulty:** Hard
**Estimated Time:** 8 hours
**Skills You'll Practice:** concurrency awareness, service-layer invariants, update semantics
**The Story:** As an editor, I want each entry to have a version number that increments on content edits so that I can reason about revision history.

**Acceptance Criteria:**
- [ ] Entries start at version 1.
- [ ] Updating title, summary, content, slug, tags, or difficulty increments version.
- [ ] Status changes and curation do not increment content version.
- [ ] Version appears in workspace metadata.
- [ ] Tests protect increment behavior.

**Files You'll Likely Touch:**
- `prisma/schema.prisma`: add field to `KnowledgeEntry` in `prisma/schema.prisma:58-82`.
- `src/repositories/knowledgeEntryRepository.ts`: update data is in `src/repositories/knowledgeEntryRepository.ts:304-340`.
- `src/services/knowledgeEntryService.ts`: update service is in `src/services/knowledgeEntryService.ts:121-160`.
- `src/types/knowledge.ts`: `WorkspaceEntry` is in `src/types/knowledge.ts:19-34`.
- `src/components/knowledge/workspace-dashboard.tsx`: metadata panel renders in `src/components/knowledge/workspace-dashboard.tsx:249-273`.

**Pair Programming Implementation Plan:**
1. Add `version Int @default(1)` to Prisma model.
2. Include `version` in `WorkspaceEntry`.
3. Update `mapWorkspaceEntry()` in `src/repositories/knowledgeEntryRepository.ts:404-425`.
4. In `updateKnowledgeEntry()`, add `version: { increment: 1 }` to data.
5. Do not increment in `updateKnowledgeEntryStatus()` or `updateKnowledgeEntryCuration()`.
6. Render version in metadata panel.
7. Add a repository unit test by mocking Prisma update input, or service test if easier.
8. Consider whether create audit metadata should include version 1 and update metadata should include next version.

**Tests To Consider:**
- Mock `client.knowledgeEntry.update` and assert content update includes version increment.
- Test curation/status functions do not include version increment if you add granular repository tests.

**Senior Review Questions:**
- Does version mean content version or every mutation version? The acceptance criteria define content version.
- Is this enough for history? No; it is a counter, not a revision table.
- Could concurrent edits skip or conflict? Prisma increment is atomic, but UI conflict detection is not solved.

**What Could Go Wrong:**
- Status publish increments version, muddying content history.
- UI shows version for search results where it was not added to SQL.

**Stretch Goal:** Add optimistic concurrency with expected version on update.

## Story 25: Add Editor Draft Limit
**Difficulty:** Hard
**Estimated Time:** 7 hours
**Skills You'll Practice:** business policy, repository counting, service guard tests
**The Story:** As an admin, I want editors limited to a reasonable number of open drafts so that the workspace does not become a dumping ground.

**Acceptance Criteria:**
- [ ] Editors cannot create more than 10 draft entries.
- [ ] Admins are exempt.
- [ ] Published and archived entries do not count against the limit.
- [ ] API returns a clear conflict error when limit is reached.
- [ ] Test covers the limit.

**Files You'll Likely Touch:**
- `src/services/knowledgeEntryService.ts`: create guard is in `src/services/knowledgeEntryService.ts:83-118`.
- `src/repositories/knowledgeEntryRepository.ts`: add a count function near workspace queries in `src/repositories/knowledgeEntryRepository.ts:116-156`.
- `src/lib/errors.ts`: `ConflictError` exists in `src/lib/errors.ts:46-49`.
- `src/app/api/knowledge/route.ts`: create route maps service errors through `apiError` in `src/app/api/knowledge/route.ts:18-28`.
- `src/tests/services`: existing service test pattern is `src/tests/services/knowledge-entry-status.test.ts:24-49`.

**Pair Programming Implementation Plan:**
1. Add `countDraftEntriesByAuthor(authorId)` repository function filtering `status: DRAFT`.
2. In `createDraftEntry()`, after `canCreateEntry(actor)` and before slug conflict, check actor role.
3. If actor role is `EDITOR`, call the count function and throw `ConflictError("Draft limit reached")` at 10 or more.
4. Do not apply to admins.
5. Keep the route unchanged; it already returns `apiError(error)` in `src/app/api/knowledge/route.ts:26-28`.
6. Add a service test with mocked repository count and create dependencies.
7. Decide whether this limit belongs in env. For first implementation, use a named constant near service function.

**Tests To Consider:**
- Editor with 10 drafts rejects.
- Editor with 9 drafts proceeds to slug check/create.
- Admin with 10 drafts proceeds.

**Senior Review Questions:**
- Is the limit a product policy or infrastructure guard?
- Could two simultaneous creates exceed the limit? Yes unless enforced transactionally; note as future risk.
- Should archived drafts count? Acceptance says no.

**What Could Go Wrong:**
- Limit counts all statuses and blocks productive editors.
- Admin exemption accidentally allows editors because role comparison is inverted.

**Stretch Goal:** Show current draft count in workspace.

