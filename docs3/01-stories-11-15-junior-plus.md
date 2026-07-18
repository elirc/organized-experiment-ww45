# Stories 11-15: Junior-Plus Implementation Practice

## Story 11: Add Search Result Reading Time
**Difficulty:** Easy
**Estimated Time:** 2 hours
**Skills You'll Practice:** derived UI data, TypeScript DTO awareness, safe display changes
**The Story:** As a viewer, I want each result to show an estimated reading time so that I can choose the right entry for the time I have.

**Acceptance Criteria:**
- [ ] Search result cards show an estimated reading time.
- [ ] The estimate is based on available text, not a hardcoded value.
- [ ] Public entry pages can show the same estimate.
- [ ] No database migration is required.

**Files You'll Likely Touch:**
- `src/components/knowledge/search-dashboard.tsx`: result cards render in `src/components/knowledge/search-dashboard.tsx:137-159`.
- `src/app/entries/[slug]/page.tsx`: public entry content renders in `src/app/entries/[slug]/page.tsx:46-60`.
- `src/lib/utils.ts`: shared helpers currently include `cn`, `slugify`, and `dedupe` in `src/lib/utils.ts:1-18`.
- `src/types/knowledge.ts`: search entries include `summary` but not `content` in `src/types/knowledge.ts:3-17`.

**Pair Programming Implementation Plan:**
1. Read `src/types/knowledge.ts:3-17` and notice `SearchResultEntry` does not include full `content`, so search cards can only estimate from `title` + `summary` unless the API contract changes.
2. Create a small helper in `src/lib/utils.ts` such as `estimateReadingMinutes(text: string)`. Keep it pure and deterministic.
3. In `src/components/knowledge/search-dashboard.tsx:151-157`, compute from `${entry.title} ${entry.summary}` and render near updated date/score.
4. In `src/app/entries/[slug]/page.tsx:55-60`, compute from full `entry.content` and render near summary or badges.
5. Manually verify the UI does not imply search cards know full content when the DTO does not include it.

**Tests To Consider:**
- Add a small utility test under `src/tests/validation` or a new `src/tests/lib` file for short, medium, and empty text.

**Senior Review Questions:**
- Did you avoid expanding `SearchResultEntry` with `content` just for a display nicety?
- Is the helper pure enough to test without React or database setup?
- Did public page and search card estimates honestly reflect different available data?

**What Could Go Wrong:**
- Reading time on result cards is inaccurate if you pretend summary equals full content.
- Adding `content` to search results increases payload size and duplicates data already fetched by detail pages.

**Stretch Goal:** Show "Quick read" for estimates under 2 minutes.

## Story 12: Add A Search Query Character Counter
**Difficulty:** Easy
**Estimated Time:** 1.5 hours
**Skills You'll Practice:** controlled inputs, validation awareness, UX constraints
**The Story:** As a viewer, I want to know how long my search query is so that I stay inside the backend limit.

**Acceptance Criteria:**
- [ ] Search controls show current query length.
- [ ] Counter reflects the backend max of 120 characters.
- [ ] UI does not block typing differently from the API unless explicitly designed.
- [ ] Existing search behavior still works.

**Files You'll Likely Touch:**
- `src/components/knowledge/search-dashboard.tsx`: query input is in `src/components/knowledge/search-dashboard.tsx:44-50`.
- `src/lib/validation/knowledgeEntrySchemas.ts`: backend query max is declared in `src/lib/validation/knowledgeEntrySchemas.ts:23-29`.

**Pair Programming Implementation Plan:**
1. Read `searchEntriesQuerySchema` in `src/lib/validation/knowledgeEntrySchemas.ts:23-29`; note `q` is `max(120)`.
2. In `src/components/knowledge/search-dashboard.tsx:44-50`, add helper text below the `Input` showing `${query.length}/120`.
3. If adding `maxLength={120}`, decide deliberately: it aligns UI with API but changes typing behavior. Document this in the PR.
4. Keep the hook call in `src/components/knowledge/search-dashboard.tsx:20-26` unchanged.
5. Check layout at narrow widths so the counter does not crowd tag controls.

**Tests To Consider:**
- No unit test required if this is display-only.
- If you add `maxLength`, consider a component test later when browser testing is introduced.

**Senior Review Questions:**
- Is the limit sourced from a constant or duplicated magic number? If duplicated, is the tradeoff acceptable for this small app?
- Does frontend behavior align with backend validation?
- Does this create a false promise that tags/page filters share the same limit?

**What Could Go Wrong:**
- The backend limit changes and the UI counter silently becomes stale.
- The counter is placed inside the input label and harms accessibility.

**Stretch Goal:** Extract `SEARCH_QUERY_MAX_LENGTH` into a shared constant if the repo pattern supports it.

## Story 13: Add Entry Slug Preview While Editing
**Difficulty:** Easy-Medium
**Estimated Time:** 2.5 hours
**Skills You'll Practice:** form state, shared utilities, validation boundary thinking
**The Story:** As an editor, I want to preview the generated slug while typing a title so that I can create cleaner entry URLs.

**Acceptance Criteria:**
- [ ] New-entry mode shows a generated slug preview from title when slug field is blank.
- [ ] Existing manual slug entry still wins over generated preview.
- [ ] Backend slug normalization remains the source of truth.
- [ ] No API changes are required.

**Files You'll Likely Touch:**
- `src/components/knowledge/workspace-dashboard.tsx`: form state and fields are in `src/components/knowledge/workspace-dashboard.tsx:23-71` and `src/components/knowledge/workspace-dashboard.tsx:129-174`.
- `src/lib/utils.ts`: `slugify` already exists in `src/lib/utils.ts:8-14`.
- `src/lib/validation/knowledgeEntrySchemas.ts`: backend slug transform is in `src/lib/validation/knowledgeEntrySchemas.ts:37-54`.

**Pair Programming Implementation Plan:**
1. Read `slugify()` in `src/lib/utils.ts:8-14`.
2. Read backend slug transform in `src/lib/validation/knowledgeEntrySchemas.ts:45-54`; understand that the API will normalize again.
3. Import `slugify` into `workspace-dashboard.tsx`.
4. Near the title/slug fields in `src/components/knowledge/workspace-dashboard.tsx:129-146`, compute `const effectiveSlugPreview = slugify(formState.slug || formState.title)`.
5. Render a small preview line below the slug input.
6. Do not remove `saveKnowledgeEntrySchema` slug normalization.

**Tests To Consider:**
- Add a utility test for `slugify` edge cases if none exists.
- Do not test React form behavior unless the project adds React component testing.

**Senior Review Questions:**
- Is the UI preview clearly a preview, not the persistence source of truth?
- Does importing `slugify` into a client component pull in anything server-only? It does not; `src/lib/utils.ts:1-18` is safe.
- What happens with titles that slugify to fewer than three characters?

**What Could Go Wrong:**
- You update only UI slug generation and forget backend validation already exists.
- You accidentally overwrite a manually typed slug whenever title changes.

**Stretch Goal:** Show a warning when the preview would fail the backend minimum slug length in `src/lib/validation/knowledgeEntrySchemas.ts:51-54`.

## Story 14: Add Workspace Unsaved Changes Warning Text
**Difficulty:** Easy-Medium
**Estimated Time:** 3 hours
**Skills You'll Practice:** derived state, form comparison, UX edge cases
**The Story:** As an editor, I want to know when my workspace form has unsaved changes so that I do not accidentally switch entries.

**Acceptance Criteria:**
- [ ] Editor panel shows "Unsaved changes" when current form differs from loaded entry.
- [ ] Message disappears after successful save or after selecting a fresh entry.
- [ ] New draft mode works.
- [ ] This story does not block navigation yet; it only displays warning text.

**Files You'll Likely Touch:**
- `src/components/knowledge/workspace-dashboard.tsx`: `buildFormState` is in `src/components/knowledge/workspace-dashboard.tsx:51-63`, form state starts in `src/components/knowledge/workspace-dashboard.tsx:84-86`, save flow is in `src/components/knowledge/workspace-dashboard.tsx:97-127`.

**Pair Programming Implementation Plan:**
1. Read `buildFormState(entry)` in `src/components/knowledge/workspace-dashboard.tsx:51-63`.
2. Inside `WorkspaceEditorPanel`, compute `initialFormState = buildFormState(entry)` and compare it to `formState`.
3. Because objects compare by reference, compare fields explicitly: title, slug, summary, content, tags.
4. Render warning near `message` in `src/components/knowledge/workspace-dashboard.tsx:176`.
5. After successful save, update the local baseline or rely on selected entry re-fetch/remount. The component key in `src/components/knowledge/workspace-dashboard.tsx:455-457` already remounts when `effectiveEntryId` changes.
6. Keep this display-only; do not add browser `beforeunload` yet.

**Tests To Consider:**
- No existing React testing setup; document manual cases.
- Consider extracting a pure `isFormDirty` helper if you want unit tests.

**Senior Review Questions:**
- Did you avoid comparing objects by reference?
- Does the warning behave correctly when `entry` changes?
- Does this create a false guarantee that navigation is blocked?

**What Could Go Wrong:**
- Whitespace differences in tags cause constant dirty state.
- Successful save leaves the warning visible because the baseline is not refreshed.

**Stretch Goal:** Add a confirm dialog before selecting a different entry.

## Story 15: Add Workspace Entry Summary Truncation
**Difficulty:** Easy-Medium
**Estimated Time:** 2 hours
**Skills You'll Practice:** UI polish, utility extraction, layout-safe text
**The Story:** As an editor, I want long entry summaries in the workspace list to be shortened so that the list stays scannable.

**Acceptance Criteria:**
- [ ] Workspace list summaries truncate to a consistent length.
- [ ] Full summary remains available in the editor form.
- [ ] Search results are unchanged.
- [ ] Truncation handles short summaries safely.

**Files You'll Likely Touch:**
- `src/components/knowledge/workspace-dashboard.tsx`: workspace list cards render in `src/components/knowledge/workspace-dashboard.tsx:411-431`.
- `src/lib/utils.ts`: shared helpers live in `src/lib/utils.ts:1-18`.

**Pair Programming Implementation Plan:**
1. Decide whether truncation should be CSS-only or text-content based. CSS is simpler; a helper is more testable.
2. If helper-based, add `truncateText(value, maxLength)` to `src/lib/utils.ts`.
3. Use it only in the list summary at `src/components/knowledge/workspace-dashboard.tsx:427-429`.
4. Do not change `Textarea` values in the editor form at `src/components/knowledge/workspace-dashboard.tsx:149-165`.
5. Verify selected cards and unselected cards both preserve readable contrast.

**Tests To Consider:**
- Unit test `truncateText` for exact length, short string, and empty string.

**Senior Review Questions:**
- Is truncation a presentation concern or a data concern here?
- Did you avoid mutating the underlying `WorkspaceEntry.summary`?
- Does truncation hide information that should be accessible elsewhere?

**What Could Go Wrong:**
- Truncating before save would persist shortened summaries.
- Helper truncates in the middle of multibyte characters; acceptable here if ASCII-focused, but know the tradeoff.

**Stretch Goal:** Add `title={entry.summary}` on the summary paragraph for quick inspection.

