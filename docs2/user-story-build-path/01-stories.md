# User Stories

## Story 1: Clarify The Search Empty State
**Difficulty:** Easy
**Estimated Time:** 1 hour
**Skills You'll Practice:** React rendering, conditional UI, copy changes
**The Story:** As a viewer, I want a clearer empty state so that I know how to adjust my search.
**Acceptance Criteria:**
- [ ] Empty state appears only when no results exist and loading is false.
- [ ] Empty state mentions removing tag filters and broadening search language.
- [ ] Existing loading state still appears during fetch.
**Files You'll Likely Touch:** `src/components/knowledge/search-dashboard.tsx` because empty/loading states render at `src/components/knowledge/search-dashboard.tsx:130-168`.
**High-Level Implementation Plan:**
1. Edit `src/components/knowledge/search-dashboard.tsx` near the empty state.
2. Keep the condition from `src/components/knowledge/search-dashboard.tsx:161`.
3. Update only the displayed copy.
**Tips:**
- Do not change `useKnowledgeSearch()` in `src/hooks/useKnowledgeSearch.ts:14-33`.
- Keep the loading block in `src/components/knowledge/search-dashboard.tsx:131-135`.
- Keep the result card map in `src/components/knowledge/search-dashboard.tsx:137-159`.
**What Could Go Wrong:**
- Empty state appears during loading if the condition changes.
- Copy suggests client-side sorting even though ranking is in `src/repositories/knowledgeEntryRepository.ts:244-253`.
**Stretch Goal:** Add a "Clear filters" button that calls `setSelectedTags([])` and `setFeaturedOnly(false)`.
**Connects To:** Story 4, because it prepares you to modify search controls.

## Story 2: Add A Role Tooltip Line In The Header
**Difficulty:** Easy
**Estimated Time:** 1 hour
**Skills You'll Practice:** Props, conditional rendering, role-aware UI
**The Story:** As a signed-in user, I want the header to show my role context so that I understand my access level.
**Acceptance Criteria:**
- [ ] Header still shows the role badge.
- [ ] Viewers see search-only wording.
- [ ] Editors/admins see workspace-capable wording.
**Files You'll Likely Touch:** `src/components/layout/app-header.tsx` because role and navigation render at `src/components/layout/app-header.tsx:21-31`.
**High-Level Implementation Plan:**
1. Add a short line near the existing header subtitle in `src/components/layout/app-header.tsx:16-18`.
2. Use `session.user.role` from `src/components/layout/app-header.tsx:8`.
3. Avoid changing server guards in `src/app/workspace/page.tsx:13-15`.
**Tips:**
- `SessionSummary` is defined in `src/types/knowledge.ts:36-44`.
- UI visibility is not permission security; API guards live in `src/lib/auth/apiAuth.ts:19-43`.
- Keep navigation links unchanged.
**What Could Go Wrong:**
- Viewers might see workspace wording while still being redirected by `src/app/workspace/page.tsx:13-15`.
- Long text could crowd the header.
**Stretch Goal:** Use the existing `Badge` component from `src/components/ui/badge.tsx:3-23`.
**Connects To:** Story 6, because role context matters for editor-only features.

## Story 3: Show Tag Count On Search Cards
**Difficulty:** Easy
**Estimated Time:** 1.5 hours
**Skills You'll Practice:** Rendering existing data, TypeScript arrays, small UI changes
**The Story:** As a viewer, I want to see how many tags an entry has so that I can judge how broadly it applies.
**Acceptance Criteria:**
- [ ] Each search result card shows tag count.
- [ ] Count uses `entry.tags.length`.
- [ ] Existing tag badges still render.
**Files You'll Likely Touch:** `src/components/knowledge/search-dashboard.tsx` because cards render at `src/components/knowledge/search-dashboard.tsx:137-159`.
**High-Level Implementation Plan:**
1. Add text near the score or updated date in `src/components/knowledge/search-dashboard.tsx:154-157`.
2. Use `entry.tags.length` from the mapped `SearchResultEntry`.
3. Keep link target unchanged at `src/components/knowledge/search-dashboard.tsx:138-141`.
**Tips:**
- `SearchResultEntry.tags` is typed in `src/types/knowledge.ts:3-17`.
- Tags come from SQL aggregation in `src/repositories/knowledgeEntryRepository.ts:197-204`.
- Do not alter database schema.
**What Could Go Wrong:**
- Adding count inside the tag map repeats it for every tag.
- Assuming tags can be undefined conflicts with `src/types/knowledge.ts:15`.
**Stretch Goal:** Display "1 tag" vs "N tags".
**Connects To:** Story 5, because it adds more metadata to existing result cards.

## Story 4: Add A Clear All Search Filters Control
**Difficulty:** Medium
**Estimated Time:** 2 hours
**Skills You'll Practice:** Local state, event handlers, filter UX
**The Story:** As a viewer, I want to clear query, tags, and featured-only filters at once so that I can reset search quickly.
**Acceptance Criteria:**
- [ ] Control clears `query`.
- [ ] Control clears `selectedTags`.
- [ ] Control turns `featuredOnly` off.
- [ ] Search results refresh through existing React Query flow.
**Files You'll Likely Touch:** `src/components/knowledge/search-dashboard.tsx` because filter state is declared at `src/components/knowledge/search-dashboard.tsx:14-18`.
**High-Level Implementation Plan:**
1. Add a button in the search controls aside in `src/components/knowledge/search-dashboard.tsx:32-107`.
2. On click, call `setQuery("")`, `setSelectedTags([])`, and `setFeaturedOnly(false)`.
3. Let `useKnowledgeSearch()` refetch because filters change at `src/components/knowledge/search-dashboard.tsx:20-26`.
**Tips:**
- Reuse `Button` from `src/components/ui/button.tsx:5-26` if the visual style fits.
- Keep the existing tag-only clear button in `src/components/knowledge/search-dashboard.tsx:56-62`.
- Do not call `queryClient` manually.
**What Could Go Wrong:**
- Clearing only tags leaves query active.
- Adding manual refetch duplicates React Query behavior.
**Stretch Goal:** Disable the clear-all control when all filters are already default.
**Connects To:** Story 6, because it builds confidence with state-driven API calls.

## Story 5: Add Workspace Published Date Visibility
**Difficulty:** Medium
**Estimated Time:** 2 hours
**Skills You'll Practice:** Existing data display, conditional rendering, date formatting
**The Story:** As an editor, I want to see whether a workspace entry is published and when so that I can manage content freshness.
**Acceptance Criteria:**
- [ ] Entry list or metadata panel shows published date when present.
- [ ] Drafts show "Not published".
- [ ] Existing update date remains visible.
**Files You'll Likely Touch:** `src/components/knowledge/workspace-dashboard.tsx` because metadata renders at `src/components/knowledge/workspace-dashboard.tsx:249-273`.
**High-Level Implementation Plan:**
1. Inspect `selectedEntry` metadata in `src/components/knowledge/workspace-dashboard.tsx:249-273`.
2. Reuse the existing published date expression in `src/components/knowledge/workspace-dashboard.tsx:263-267`.
3. Optionally add a condensed line to the entry list at `src/components/knowledge/workspace-dashboard.tsx:411-431`.
**Tips:**
- `WorkspaceEntry.publishedAt` is typed in `src/types/knowledge.ts:19-34`.
- Status changes set `publishedAt` in `src/repositories/knowledgeEntryRepository.ts:343-368`.
- Avoid changing status transition rules.
**What Could Go Wrong:**
- Formatting `null` directly creates "Invalid Date".
- Putting too much metadata in the list makes cards crowded.
**Stretch Goal:** Add a freshness badge for published entries older than 90 days.
**Connects To:** Story 7, because it prepares you for status-related features.

## Story 6: Add A Current Session API Hook Usage
**Difficulty:** Medium
**Estimated Time:** 3 hours
**Skills You'll Practice:** React Query, API reads, session state
**The Story:** As a user, I want the app to confirm my current session in the UI so that stale login state is visible.
**Acceptance Criteria:**
- [ ] A client component calls `useSession()`.
- [ ] It handles loading, success, and error.
- [ ] It does not replace existing server guards.
**Files You'll Likely Touch:** `src/hooks/useSession.ts`, `src/components/layout/app-header.tsx`, maybe a new component under `src/components/auth`.
**High-Level Implementation Plan:**
1. Read `src/hooks/useSession.ts:8-13`.
2. Create or update a small client component that calls it.
3. Render it from `src/components/layout/app-header.tsx:21-31`.
4. Keep `src/app/page.tsx:7-11` and `src/app/workspace/page.tsx:7-15` unchanged.
**Tips:**
- `GET /api/me` returns `SessionSummary` in `src/app/api/me/route.ts:6-16`.
- `useSession()` has `retry: false` in `src/hooks/useSession.ts:9-13`.
- Do not put client hooks in server components unless the file has `"use client"`.
**What Could Go Wrong:**
- Calling `useSession()` directly in `app-header.tsx` would require making that component client-side.
- Removing server guards would weaken routing.
**Stretch Goal:** Show session expiration with `expiresAt`.
**Connects To:** Story 8, because full-stack work needs session awareness.

## Story 7: Add A Workspace Status Counter
**Difficulty:** Medium
**Estimated Time:** 3 hours
**Skills You'll Practice:** Derived state, workspace data, UI summarization
**The Story:** As an editor, I want counts by draft/published/archived status so that I can understand my content workload.
**Acceptance Criteria:**
- [ ] Workspace shows counts for each `EntryStatus`.
- [ ] Counts derive from loaded workspace entries.
- [ ] Status filters still work.
**Files You'll Likely Touch:** `src/components/knowledge/workspace-dashboard.tsx`, maybe `src/hooks/useWorkspaceEntries.ts`.
**High-Level Implementation Plan:**
1. Use `entriesQuery.data?.items` from `src/components/knowledge/workspace-dashboard.tsx:358`.
2. Compute counts near `WorkspaceDashboard` state in `src/components/knowledge/workspace-dashboard.tsx:354-365`.
3. Render counts near the workspace heading or filter buttons in `src/components/knowledge/workspace-dashboard.tsx:371-409`.
**Tips:**
- `EntryStatus` is imported in `src/components/knowledge/workspace-dashboard.tsx:3`.
- Filters are toggled in `src/components/knowledge/workspace-dashboard.tsx:384-408`.
- Workspace list API already accepts status filters in `src/app/api/knowledge/workspace/route.ts:21-25`.
**What Could Go Wrong:**
- Counts only reflect current page if pagination is later added.
- Applying filters before counting may hide total workload.
**Stretch Goal:** Add "All" count.
**Connects To:** Story 8, because status is part of workflow.

## Story 8: Add Draft Preview For Editors
**Difficulty:** Hard
**Estimated Time:** 6 hours
**Skills You'll Practice:** Routing, permissions, server components, service reads
**The Story:** As an editor, I want to preview my draft entry before publishing so that I can check formatting.
**Acceptance Criteria:**
- [ ] Draft preview route requires login.
- [ ] Editors can preview their own drafts.
- [ ] Admins can preview any draft.
- [ ] Viewers cannot preview drafts.
- [ ] Published public entry route remains unchanged.
**Files You'll Likely Touch:** `src/app/entries/[slug]/page.tsx`, new route under `src/app/workspace`, `src/services/knowledgeEntryService.ts`, `src/repositories/knowledgeEntryRepository.ts`, `src/lib/auth/permissions.ts`, maybe tests.
**High-Level Implementation Plan:**
1. Add a server page route for preview.
2. Use `getServerSession()` like `src/app/entries/[slug]/page.tsx:18-23`.
3. Add a service read that uses workspace permission rules from `src/services/knowledgeEntryService.ts:59-67`.
4. Add repository lookup by slug with workspace scope, following `src/repositories/knowledgeEntryRepository.ts:56-83`.
5. Render Markdown like `src/app/entries/[slug]/page.tsx:58-60`.
**Tips:**
- Public entry route intentionally calls `getPublishedEntryBySlug()` in `src/app/entries/[slug]/page.tsx:25-30`.
- Reuse `canReadEntryInWorkspace()` from `src/lib/auth/permissions.ts:50-60`.
- Do not make drafts public through `findPublishedEntryBySlug()`.
**What Could Go Wrong:**
- Preview accidentally exposes all drafts by slug.
- Published route starts showing drafts.
**Stretch Goal:** Add a preview button to the workspace editor panel.
**Connects To:** Story 9, because it touches frontend, backend, and permissions.

## Story 9: Add Entry Review Notes
**Difficulty:** Hard
**Estimated Time:** 8 hours
**Skills You'll Practice:** Prisma migration, validation, API mutation, UI form state, audit logging
**The Story:** As an editor, I want to store private review notes on an entry so that I can track publication readiness.
**Acceptance Criteria:**
- [ ] `KnowledgeEntry` stores review notes.
- [ ] Workspace editor can edit notes.
- [ ] Notes do not appear in public search cards or public entry pages.
- [ ] Notes changes are audit logged.
**Files You'll Likely Touch:** `prisma/schema.prisma`, `src/lib/validation/knowledgeEntrySchemas.ts`, `src/types/knowledge.ts`, `src/components/knowledge/workspace-dashboard.tsx`, `src/services/knowledgeEntryService.ts`, `src/repositories/knowledgeEntryRepository.ts`, tests.
**High-Level Implementation Plan:**
1. Add nullable `reviewNotes` to `KnowledgeEntry` near curation fields in `prisma/schema.prisma:58-82`.
2. Extend save schema in `src/lib/validation/knowledgeEntrySchemas.ts:37-54`.
3. Extend `WorkspaceEntry` in `src/types/knowledge.ts:19-34`, not `SearchResultEntry` in `src/types/knowledge.ts:3-17`.
4. Add form state in `src/components/knowledge/workspace-dashboard.tsx:23-71`.
5. Persist through service and repository update paths in `src/services/knowledgeEntryService.ts:121-160` and `src/repositories/knowledgeEntryRepository.ts:304-340`.
6. Add audit metadata in `src/services/knowledgeEntryService.ts:148-157`.
**Tips:**
- Keep public search DTO free of review notes.
- Follow existing curation notes pattern in `prisma/schema.prisma:68`.
- Add a migration with `npm run db:migrate`.
**What Could Go Wrong:**
- Notes leak into `SearchResultEntry`.
- Schema changes without Prisma migration break runtime.
- Audit log misses the notes update.
**Stretch Goal:** Show "has review notes" indicator in the workspace list.
**Connects To:** Story 10, because it introduces a new domain concept.

## Story 10: Add Saved Search Alerts
**Difficulty:** Expert
**Estimated Time:** 12+ hours
**Skills You'll Practice:** Product design, schema modeling, caching, API design, authorization, performance
**The Story:** As a user, I want to save a search query and filters so that I can revisit important knowledge views quickly.
**Acceptance Criteria:**
- [ ] Users can save a search with query, tags, and featured-only setting.
- [ ] Saved searches are scoped to the signed-in user.
- [ ] Users can list and delete their saved searches.
- [ ] Applying a saved search updates the search dashboard filters.
- [ ] API routes enforce session ownership.
**Files You'll Likely Touch:** `prisma/schema.prisma`, `src/app/api`, `src/services`, `src/repositories`, `src/hooks`, `src/components/knowledge/search-dashboard.tsx`, `src/types/knowledge.ts`, tests.
**High-Level Implementation Plan:**
1. Design `SavedSearch` in `prisma/schema.prisma` related to `User` from `prisma/schema.prisma:30-44`.
2. Add validation schemas for create/delete/list payloads near `src/lib/validation/knowledgeEntrySchemas.ts:23-71` or a new validation file.
3. Add repository functions following `src/repositories/sessionRepository.ts:3-32` and ownership patterns from `src/repositories/knowledgeEntryRepository.ts:116-127`.
4. Add service functions that require signed-in user ownership.
5. Add API routes that call `requireApiSession()` from `src/lib/auth/apiAuth.ts:19-33`.
6. Add hooks using React Query patterns from `src/hooks/useKnowledgeSearch.ts:14-33` and `src/hooks/useEntryMutations.ts:14-87`.
7. Add UI controls in `src/components/knowledge/search-dashboard.tsx:32-107`.
8. Add tests for ownership and validation.
**Tips:**
- Store tag slugs, not tag names, because search sends slugs in `src/hooks/useKnowledgeSearch.ts:28`.
- Use session user id, not email, for ownership.
- Keep saved searches separate from ranked search SQL in `src/repositories/knowledgeEntryRepository.ts:158-264`.
**What Could Go Wrong:**
- Users can delete another user's saved search if ownership is not checked.
- Applying a saved search mutates server state unnecessarily.
- Saved search tags drift if tag slugs are renamed.
**Stretch Goal:** Add "default saved search" per user.
**Connects To:** This is the capstone because it requires design across the whole architecture.

