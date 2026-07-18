# Stories 16-20: Mid-Level Feature Construction

## Story 16: Add Search Pagination Controls
**Difficulty:** Medium
**Estimated Time:** 5 hours
**Skills You'll Practice:** pagination state, API contract reuse, React Query keys, UI edge cases
**The Story:** As a viewer, I want next/previous controls for search results so that I can browse beyond the first page.

**Acceptance Criteria:**
- [ ] Search UI tracks current page.
- [ ] Page changes call the existing search API with `page`.
- [ ] Previous is disabled on page 1.
- [ ] Next is disabled when there are no more results.
- [ ] Changing query/tags/featured resets page to 1.

**Files You'll Likely Touch:**
- `src/components/knowledge/search-dashboard.tsx`: current page is hardcoded in hook input at `src/components/knowledge/search-dashboard.tsx:20-26`.
- `src/hooks/useKnowledgeSearch.ts`: already serializes `page` and `pageSize` in `src/hooks/useKnowledgeSearch.ts:25-26`.
- `src/lib/validation/knowledgeEntrySchemas.ts`: backend supports page/pageSize in `src/lib/validation/knowledgeEntrySchemas.ts:23-29`.
- `src/repositories/knowledgeEntryRepository.ts`: SQL uses limit/offset in `src/repositories/knowledgeEntryRepository.ts:158-164` and `src/repositories/knowledgeEntryRepository.ts:251-253`.

**Pair Programming Implementation Plan:**
1. Add `const [page, setPage] = useState(1)` beside filter state in `src/components/knowledge/search-dashboard.tsx:14-18`.
2. Pass `page` into `useKnowledgeSearch()` instead of hardcoded `1`.
3. Add a derived `pageSize` constant to avoid scattering `12`.
4. Add `useEffect` to reset page to 1 when `query`, `selectedTags`, or `featuredOnly` changes. This component already has `"use client"` at `src/components/knowledge/search-dashboard.tsx:1`.
5. Compute `hasNext = page * pageSize < (searchQuery.data?.totalCount ?? 0)`.
6. Render controls near result count in `src/components/knowledge/search-dashboard.tsx:122-128`.
7. Make sure loading state does not make buttons jump layout.

**Tests To Consider:**
- Component tests are not configured, so manually verify page 1, page 2, no results, and filter reset.
- Add a pure helper test only if you extract pagination math.

**Senior Review Questions:**
- Does the query key include page? `useKnowledgeSearch()` uses `filters` in `src/hooks/useKnowledgeSearch.ts:31`, so yes if page changes.
- Does `totalCount` come from the same filtered query? It is returned in `src/repositories/knowledgeEntryRepository.ts:256-263`.
- What happens when current page becomes invalid after a filter change?

**What Could Go Wrong:**
- Forgetting to reset page causes page 3 of a new query to show empty results.
- Next button uses `items.length === pageSize`, which fails on exact final pages without checking `totalCount`.

**Stretch Goal:** Add direct "Page X of Y" display.

## Story 17: Add API Error Detail Display In Workspace
**Difficulty:** Medium
**Estimated Time:** 4 hours
**Skills You'll Practice:** error propagation, mutation handling, user feedback
**The Story:** As an editor, I want save errors to tell me what failed so that I can fix my entry quickly.

**Acceptance Criteria:**
- [ ] Workspace save failures display the API message.
- [ ] Zod validation failures still show a helpful message.
- [ ] Create, update, status, and curation errors are handled consistently.
- [ ] No raw stack traces appear in the UI.

**Files You'll Likely Touch:**
- `src/lib/http/client.ts`: throws API message in `src/lib/http/client.ts:13-19`.
- `src/lib/http/responses.ts`: Zod errors are shaped in `src/lib/http/responses.ts:23-33`.
- `src/components/knowledge/workspace-dashboard.tsx`: mutation error messages are set in `src/components/knowledge/workspace-dashboard.tsx:124-126`, `src/components/knowledge/workspace-dashboard.tsx:194-197`, `src/components/knowledge/workspace-dashboard.tsx:214-217`, and `src/components/knowledge/workspace-dashboard.tsx:294-297`.

**Pair Programming Implementation Plan:**
1. Read `apiClient()` in `src/lib/http/client.ts:13-19`; it currently throws `payload.error?.message`.
2. Read `apiError()` in `src/lib/http/responses.ts:23-33`; validation issues exist but the client does not expose them.
3. Decide whether to enhance `apiClient()` to include `issues` or keep UI at message level.
4. Extract a local helper in `workspace-dashboard.tsx`, such as `getErrorMessage(error, fallback)`, to remove repeated ternaries.
5. Replace repeated `mutationError instanceof Error ? ...` blocks with helper calls.
6. Keep server messages user-safe; do not expose `console.error` details from `src/lib/http/responses.ts:36-46`.

**Tests To Consider:**
- Unit test `apiClient()` only if you add a richer error class.
- Add a route-level validation test similar to `src/tests/api/knowledge-curation-route.test.ts:22-42` if behavior changes.

**Senior Review Questions:**
- Should the client know about Zod's `flatten()` structure from `src/lib/http/responses.ts:29`, or should it stay abstract?
- Does the UI give enough detail without exposing internals?
- Is this a local helper or shared abstraction?

**What Could Go Wrong:**
- Enhancing `apiClient()` breaks all hooks if the thrown type changes unexpectedly.
- Showing all Zod issues creates noisy UI in the workspace form.

**Stretch Goal:** Add field-level error rendering for title, summary, content, and tags.

## Story 18: Add Featured-Only Count In Search Controls
**Difficulty:** Medium
**Estimated Time:** 4 hours
**Skills You'll Practice:** API extension, query hooks, aggregate thinking
**The Story:** As a viewer, I want to know how many published entries are featured so that I understand what the filter will do.

**Acceptance Criteria:**
- [ ] Search controls display a featured published count.
- [ ] Count is fetched from the backend.
- [ ] Count respects authentication.
- [ ] Existing search endpoint behavior is unchanged.

**Files You'll Likely Touch:**
- `src/app/api/knowledge/search/route.ts`: current search route is in `src/app/api/knowledge/search/route.ts:18-36`.
- `src/repositories/knowledgeEntryRepository.ts`: featured filter exists in `src/repositories/knowledgeEntryRepository.ts:174`.
- `src/services/knowledgeEntryService.ts`: search service is in `src/services/knowledgeEntryService.ts:39-47`.
- `src/hooks`: add a hook beside `src/hooks/useKnowledgeSearch.ts:14-33`.
- `src/components/knowledge/search-dashboard.tsx`: featured toggle renders in `src/components/knowledge/search-dashboard.tsx:93-106`.

**Pair Programming Implementation Plan:**
1. Add a repository function such as `countFeaturedPublishedEntries()` that filters `status: PUBLISHED` and `isFeatured: true`, following repository style in `src/repositories/knowledgeEntryRepository.ts:34-156`.
2. Add service wrapper in `src/services/knowledgeEntryService.ts` so routes do not call repositories directly.
3. Add a new route like `src/app/api/knowledge/featured-count/route.ts` or include count in an existing metadata endpoint. Prefer a new thin route for training clarity.
4. Require session in the route using `requireApiSession()` like `src/app/api/knowledge/search/route.ts:20-21`.
5. Add `useFeaturedKnowledgeCount()` hook using the `useTags()` pattern in `src/hooks/useTags.ts:13-17`.
6. Render count near the featured-only toggle.
7. Invalidate or refetch count after curation. This means `useCurateEntryMutation()` in `src/hooks/useEntryMutations.ts:79-84` should invalidate the new query key.

**Tests To Consider:**
- Route test for unauthenticated access if test helpers are introduced.
- Repository test for count filter if mocking Prisma.

**Senior Review Questions:**
- Should the count respect current tags/query or be global? The story says featured published count, so global is acceptable.
- Does curation invalidate the new count?
- Did you keep search result payload focused?

**What Could Go Wrong:**
- Count includes drafts because status filter is missing.
- Count goes stale after curation because the query key is not invalidated.

**Stretch Goal:** Show the count on the toggle label only after it loads.

## Story 19: Add A Public Entry Not Found Test
**Difficulty:** Medium
**Estimated Time:** 3 hours
**Skills You'll Practice:** server page reasoning, service mocking, not-found behavior
**The Story:** As a maintainer, I want a test around public entry lookup failure so that unpublished or missing entries do not render accidentally.

**Acceptance Criteria:**
- [ ] Test covers missing published entry behavior.
- [ ] Test does not require a real database.
- [ ] Test protects the public route from showing drafts.
- [ ] Existing tests still pass.

**Files You'll Likely Touch:**
- `src/app/entries/[slug]/page.tsx`: public entry page calls `getPublishedEntryBySlug()` in `src/app/entries/[slug]/page.tsx:25-30`.
- `src/services/knowledgeEntryService.ts`: published entry service throws not found in `src/services/knowledgeEntryService.ts:49-57`.
- `src/tests`: existing Vitest patterns are in `src/tests/services/knowledge-entry-status.test.ts:1-49`.

**Pair Programming Implementation Plan:**
1. Decide test target: service-level is easier and valuable; page-level `notFound()` mocking may be more brittle.
2. For service-level, mock `findPublishedEntryBySlug` from `src/repositories/knowledgeEntryRepository.ts:34-54`.
3. Assert `getPublishedEntryBySlug("missing")` rejects with `NotFoundError`.
4. Add a second case where repository returns `null` for a draft-like lookup. The service only sees null, so name the test around "repository does not return unpublished entries."
5. Keep test structure similar to `src/tests/services/knowledge-entry-status.test.ts:8-17`.

**Tests To Consider:**
- `src/tests/services/published-entry-lookup.test.ts`.

**Senior Review Questions:**
- Are you testing the service rule or the Next.js rendering behavior?
- Does the test prove drafts are hidden, or only that null is handled?
- Would an integration test with a real database be stronger later?

**What Could Go Wrong:**
- Mocking `notFound()` from Next tightly couples to framework internals.
- Test accidentally imports modules before mocks are registered.

**Stretch Goal:** Add a repository-scope test that `findPublishedEntryBySlug` includes `status: PUBLISHED`.

## Story 20: Add Query Key Constants
**Difficulty:** Medium
**Estimated Time:** 4 hours
**Skills You'll Practice:** refactoring, cache consistency, shared client conventions
**The Story:** As a developer, I want React Query keys centralized so that future invalidations do not drift.

**Acceptance Criteria:**
- [ ] Query keys are defined in one shared client-safe module.
- [ ] Existing hooks use the shared keys.
- [ ] Mutation invalidation still targets the same caches.
- [ ] No behavior changes.

**Files You'll Likely Touch:**
- `src/hooks/useKnowledgeSearch.ts`: uses `["knowledge-search", filters]` in `src/hooks/useKnowledgeSearch.ts:30-33`.
- `src/hooks/useWorkspaceEntries.ts`: uses `["workspace-entries", statuses]` in `src/hooks/useWorkspaceEntries.ts:19-22`.
- `src/hooks/useWorkspaceEntry.ts`: uses `["knowledge-entry", entryId]` in `src/hooks/useWorkspaceEntry.ts:9-13`.
- `src/hooks/useTags.ts`: uses `["tags"]` in `src/hooks/useTags.ts:13-17`.
- `src/hooks/useSession.ts`: uses `["session"]` in `src/hooks/useSession.ts:8-13`.
- `src/hooks/useEntryMutations.ts`: invalidates string keys in `src/hooks/useEntryMutations.ts:23-87`.

**Pair Programming Implementation Plan:**
1. Create `src/hooks/queryKeys.ts` or `src/lib/queryKeys.ts`. Prefer `src/hooks/queryKeys.ts` because this is React Query-specific client infrastructure.
2. Export functions/objects: `knowledgeSearch(filters)`, `workspaceEntries(statuses)`, `workspaceEntry(entryId)`, `tags()`, `session()`.
3. Update each read hook first and verify types.
4. Update mutation invalidations. For broad invalidation, expose root keys such as `queryKeys.knowledgeSearchRoot`.
5. Avoid changing endpoint URLs.
6. Run TypeScript when implementing, because query key return types can be subtly wrong.

**Tests To Consider:**
- No behavior test needed if purely refactor.
- TypeScript compile is the main verification.

**Senior Review Questions:**
- Are root keys and full keys both available?
- Did broad invalidations still match all filtered queries?
- Is the module safe for client imports?

**What Could Go Wrong:**
- Invalidating only one exact filtered key leaves other pages/filters stale.
- Query key functions create new structures that do not match previous invalidation prefixes.

**Stretch Goal:** Add `as const` returns for stronger query-key typing.

