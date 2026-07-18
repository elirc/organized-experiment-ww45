# Stories 26-30: Senior Engineering Improvements

## Story 26: Add Debounced Search
**Difficulty:** Senior
**Estimated Time:** 5 hours
**Skills You'll Practice:** performance UX, React rendering, request pressure reduction
**The Story:** As a viewer, I want search to feel responsive without sending a request on every keystroke so that the app remains fast under load.

**Acceptance Criteria:**
- [ ] Typing does not trigger a backend search for every character immediately.
- [ ] Results update after a short delay.
- [ ] Tag and featured filters still update predictably.
- [ ] Loading and empty states remain correct.

**Files You'll Likely Touch:**
- `src/components/knowledge/search-dashboard.tsx`: query input and hook call are in `src/components/knowledge/search-dashboard.tsx:14-26` and `src/components/knowledge/search-dashboard.tsx:44-50`.
- `src/hooks/useKnowledgeSearch.ts`: query key uses filters in `src/hooks/useKnowledgeSearch.ts:30-33`.

**Pair Programming Implementation Plan:**
1. Decide between `useDeferredValue` and custom debounce. Use custom debounce if you need a real delay before network calls; `useDeferredValue` improves rendering priority but is not a true network debounce.
2. Add `src/hooks/useDebouncedValue.ts` as a client hook.
3. In `SearchDashboard`, compute `debouncedQuery = useDebouncedValue(query, 300)`.
4. Pass `debouncedQuery` to `useKnowledgeSearch()`.
5. Keep the visible input bound to immediate `query`.
6. If pagination from Story 16 exists, reset page when immediate filters change, not only debounced query changes.
7. Verify the UI does not show "No results" for stale previous queries during debounce in a confusing way.

**Tests To Consider:**
- Hook timer tests if a React hook testing setup is added.
- Manual test with browser devtools network tab.

**Senior Review Questions:**
- Is a custom hook worth it, or would inline effect be clearer?
- Does debouncing interact with React Query `staleTime` from `src/components/providers/app-providers.tsx:11-15`?
- Should tag clicks debounce? Probably no; they are deliberate discrete actions.

**What Could Go Wrong:**
- Debounced query and visible query diverge without any feedback.
- Clearing input leaves stale results visible too long.

**Stretch Goal:** Show a subtle "Updating..." state while query is waiting for debounce.

## Story 27: Replace Logout Cookie Parsing With NextRequest Cookies
**Difficulty:** Senior
**Estimated Time:** 3 hours
**Skills You'll Practice:** security cleanup, API consistency, low-risk refactoring
**The Story:** As a maintainer, I want logout to read cookies the same way other API auth does so that session handling is consistent.

**Acceptance Criteria:**
- [ ] Logout uses `NextRequest.cookies`.
- [ ] Logout still invalidates server-side session when token exists.
- [ ] Logout still clears the cookie.
- [ ] Behavior remains safe when no cookie exists.

**Files You'll Likely Touch:**
- `src/app/api/auth/logout/route.ts`: manual parsing exists in `src/app/api/auth/logout/route.ts:5-31`.
- `src/lib/auth/apiAuth.ts`: consistent cookie access exists in `src/lib/auth/apiAuth.ts:19-20`.
- `src/services/authService.ts`: logout service is in `src/services/authService.ts:49-50`.

**Pair Programming Implementation Plan:**
1. Import `NextRequest` into logout route.
2. Change `POST(request: Request)` to `POST(request: NextRequest)`.
3. Replace manual split logic in `src/app/api/auth/logout/route.ts:7-12` with `request.cookies.get(env.SESSION_COOKIE_NAME)?.value`.
4. Keep the `if (token)` guard from `src/app/api/auth/logout/route.ts:14-16`.
5. Keep cookie clearing options aligned with login options in `src/app/api/auth/login/route.ts:16-22`.
6. Add or update an API route test if you want to lock behavior.

**Tests To Consider:**
- Logout with cookie calls `logoutByToken`.
- Logout without cookie still returns success and clears cookie.

**Senior Review Questions:**
- Did behavior change, or only implementation?
- Are login/logout cookie attributes symmetrical enough?
- Should logout use `sameSite`, `secure`, and `path` exactly like login?

**What Could Go Wrong:**
- Switching request type without updating imports causes route compile errors.
- Cookie clearing path differs from login path and fails to clear in browser.

**Stretch Goal:** Add a logout route test following `src/tests/api/knowledge-curation-route.test.ts:22-42`.

## Story 28: Add Structured AppError Metadata
**Difficulty:** Senior
**Estimated Time:** 6 hours
**Skills You'll Practice:** error design, API compatibility, diagnostics
**The Story:** As a maintainer, I want application errors to optionally carry safe metadata so that logs and clients can diagnose failures without exposing internals.

**Acceptance Criteria:**
- [ ] `AppError` supports optional safe metadata.
- [ ] API error response can include metadata for selected errors.
- [ ] Existing error messages/status codes remain unchanged.
- [ ] Sensitive auth errors do not expose extra detail.

**Files You'll Likely Touch:**
- `src/lib/errors.ts`: AppError classes are in `src/lib/errors.ts:11-50`.
- `src/lib/http/responses.ts`: errors are serialized in `src/lib/http/responses.ts:10-47`.
- `src/services/knowledgeEntryService.ts`: conflict and auth errors are thrown in `src/services/knowledgeEntryService.ts:83-231`.

**Pair Programming Implementation Plan:**
1. Extend `AppError` constructor with optional `details?: Record<string, unknown>`.
2. Update subclasses without breaking current call sites by keeping details optional.
3. In `apiError()`, include `details` only if present and intentionally safe.
4. Add details to a low-risk error, such as invalid status transition in `src/services/knowledgeEntryService.ts:170-171`, with previous and next status.
5. Do not add details to `AuthenticationError` in `src/lib/errors.ts:22-25`.
6. Update tests or snapshots if response shapes are asserted.

**Tests To Consider:**
- Unit test `apiError(new ConflictError(...details...))` response shape.
- Test auth errors still omit details.

**Senior Review Questions:**
- Could details leak user IDs, emails, or private entry content?
- Should clients rely on details, or are they diagnostic only?
- Does this preserve backward compatibility for existing `new ConflictError("...")` call sites?

**What Could Go Wrong:**
- Metadata contains raw input or sensitive content.
- Existing clients break if error envelope shape changes unexpectedly.

**Stretch Goal:** Add an `exposeDetails` flag if you need private server logs later.

## Story 29: Add Audit Log Viewer For Admins
**Difficulty:** Senior
**Estimated Time:** 10 hours
**Skills You'll Practice:** admin-only API, pagination, DTO design, privacy filtering
**The Story:** As an admin, I want to view recent audit logs so that I can understand who changed knowledge entries.

**Acceptance Criteria:**
- [ ] Admins can view recent audit logs.
- [ ] Viewers and editors cannot access audit logs.
- [ ] Logs are paginated.
- [ ] Metadata is rendered safely.
- [ ] Existing mutation audit logging remains unchanged.

**Files You'll Likely Touch:**
- `prisma/schema.prisma`: `AuditLog` model is in `prisma/schema.prisma:104-119`.
- `src/repositories/auditLogRepository.ts`: create function exists in `src/repositories/auditLogRepository.ts:16-20`.
- `src/lib/auth/apiAuth.ts`: admin route guard uses `requireApiRole()` in `src/lib/auth/apiAuth.ts:35-43`.
- `src/components/knowledge/workspace-dashboard.tsx`: admin-only curation panel pattern is in `src/components/knowledge/workspace-dashboard.tsx:275-348`.
- New route under `src/app/api/audit-logs`.
- New hook under `src/hooks`.

**Pair Programming Implementation Plan:**
1. Add `listAuditLogs({ page, pageSize })` to `src/repositories/auditLogRepository.ts`, including actor and target entry if useful.
2. Add service wrapper `listRecentAuditLogs(actor)` or similar. Even admin-only APIs should keep business rules out of routes.
3. Add route `src/app/api/audit-logs/route.ts` requiring `requireApiRole(request, "ADMIN")`.
4. Add validation schema for page/pageSize, either in a new audit validation file or shared validation module.
5. Add `useAuditLogs()` hook with query key constants if Story 20 is complete.
6. Add an admin-only section or tab in workspace using the curation visibility pattern at `src/components/knowledge/workspace-dashboard.tsx:275-348`.
7. Render metadata carefully with `JSON.stringify(metadata, null, 2)` in a preformatted block, or whitelist fields.
8. Add route test proving non-admin gets 403.

**Tests To Consider:**
- API route test for editor rejected.
- Repository test that pagination uses skip/take.
- Service test if business policy grows.

**Senior Review Questions:**
- Should audit logs expose metadata to all admins, or should sensitive fields be redacted?
- Does this need filtering by entry/action/actor?
- How will this perform as audit logs grow?

**What Could Go Wrong:**
- Rendering raw metadata exposes sensitive content.
- Admin UI fetches audit logs for non-admin users because only UI visibility was checked.

**Stretch Goal:** Filter audit logs by `entryId`.

## Story 30: Add Search Ranking Explanation
**Difficulty:** Senior
**Estimated Time:** 7 hours
**Skills You'll Practice:** explainability, API design, SQL output shaping
**The Story:** As an admin, I want to see why a search result ranked highly so that I can tune curation responsibly.

**Acceptance Criteria:**
- [ ] Search result DTO includes ranking components for admins only, or a separate admin endpoint exposes them.
- [ ] Explanation includes text rank, featured bonus, and manual boost contribution.
- [ ] Viewers do not see admin-only ranking internals unless product approves it.
- [ ] Search ordering remains unchanged.

**Files You'll Likely Touch:**
- `src/repositories/knowledgeEntryRepository.ts`: score formula is in `src/repositories/knowledgeEntryRepository.ts:244-253`.
- `src/types/knowledge.ts`: `SearchResultEntry` is in `src/types/knowledge.ts:3-17`.
- `src/app/api/knowledge/search/route.ts`: current route only requires session in `src/app/api/knowledge/search/route.ts:18-36`.
- `src/services/knowledgeEntryService.ts`: search service is in `src/services/knowledgeEntryService.ts:39-47`.
- `src/components/knowledge/search-dashboard.tsx`: score renders in `src/components/knowledge/search-dashboard.tsx:154-157`.

**Pair Programming Implementation Plan:**
1. Decide design: expose ranking explanation to all users, only admins, or separate admin endpoint. Prefer admin-only explanation because it reveals curation mechanics.
2. Modify search route to keep session from `requireApiSession(request)` instead of discarding it.
3. Pass actor role into service/repository or map explanation at service level.
4. In SQL, return `"textRank"`, `"featuredBonus"`, and `"manualBoostBonus"` as separate numeric columns in addition to score.
5. Map those fields only when actor role is `ADMIN`.
6. Extend TypeScript response type with optional `rankingExplanation`.
7. Render explanation in search cards only for admin sessions. `SearchDashboard` receives session prop in `src/components/knowledge/search-dashboard.tsx:14`.
8. Add tests around viewer/admin response shape if route tests are feasible.

**Tests To Consider:**
- Repository mapping test for numeric conversion.
- Route/service test that viewer response omits explanation.

**Senior Review Questions:**
- Is this API changing public contract or adding optional admin metadata?
- Does explanation match the exact score formula?
- Could exposing ranking internals encourage manual gaming?

**What Could Go Wrong:**
- Score formula changes but explanation fields do not.
- SQL aliases mismatch TypeScript fields.

**Stretch Goal:** Add an admin-only "Why this ranked here" disclosure UI.

