# Flow Traces

Each trace starts at a UI component, goes through a React Query hook and `apiClient` (`src/lib/http/client.ts:1-20`), and ends at Prisma. Exercises follow each flow.

---

## Flow 1: Ranked search from the home page

1. `src/app/page.tsx:6-21` calls `getServerSession()`. With no session it redirects to `/login`. Otherwise it renders `<SearchDashboard session=...>`.
2. `src/components/knowledge/search-dashboard.tsx` keeps the filter state. Tag chips toggle **slugs** in `selectedTags` (`:66-82`), and the tag list comes from `useTags()` (`:19`), which reads the unauthenticated `GET /api/tags`.
3. `useKnowledgeSearch(filters)` (`src/hooks/useKnowledgeSearch.ts:14-34`):
   - builds `URLSearchParams`, sending `featuredOnly` only when true (`:21-23`);
   - appends one `tags` entry per slug (`:28`);
   - uses `["knowledge-search", filters]` as the query key (`:31`), so every filter change is its own cache entry.
4. `src/app/api/knowledge/search/route.ts:18-37`: `requireApiSession`, then the schema, then `searchKnowledgeBase`.
5. `searchPublishedEntries` (`src/repositories/knowledgeEntryRepository.ts:158-264`): ranked SQL. See `docs/architecture/request-lifecycle.md`, Request 1.
6. The result is `{ items, totalCount }`, which the dashboard renders as links to `/entries/${entry.slug}` (`search-dashboard.tsx:140`).

**Exercises**
- **Goal:** Explain why a viewer can open a search result but not the workspace.
  **Check:** `src/app/entries/[slug]/page.tsx:18-30` needs only a session and a published entry. `src/app/workspace/page.tsx:13-15` redirects `VIEWER` to `/`.
- **Goal:** Find whether entry content is rendered as raw HTML.
  **Check:** The entry page renders `<ReactMarkdown remarkPlugins={[remarkGfm]}>` (`entries/[slug]/page.tsx:59`), and `package.json` has no `rehype-raw`. By default react-markdown does not render embedded HTML, which limits XSS from editor-authored content.

---

## Flow 2: An editor creates a new draft

1. In `src/components/knowledge/workspace-dashboard.tsx`, the editor panel submits. With no entry selected, it calls `createMutation.mutateAsync(payload)`.
2. `useCreateEntryMutation` (`src/hooks/useEntryMutations.ts:14`) POSTs `/api/knowledge` and invalidates the workspace and search caches on success.
3. `src/app/api/knowledge/route.ts:20-23`: `requireApiRole("EDITOR")`, then `saveKnowledgeEntrySchema.parse`, then `createDraftEntry`.
4. `createDraftEntry` (`src/services/knowledgeEntryService.ts:83-119`) checks the slug, then runs a transaction with tag upserts, the entry plus joins, and the audit row.
5. The response is **201** `{ data: WorkspaceEntry }`.

**Exercises**
- **Goal:** Find what happens to an empty `slug` field.
  **Check:** `slug: slugify(value.slug?.length ? value.slug : value.title)` (`src/lib/validation/knowledgeEntrySchemas.ts:48`). It falls back to the title.
- **Goal:** Find what saving with the tag "SECURITY" does to the existing "Security" tag.
  **Check:** `slugify("SECURITY")` gives `security`, so the upsert hits the existing row and runs `update: { name: "SECURITY" }` (`src/repositories/tagRepository.ts:22-26`). Every entry tagged Security now shows "SECURITY".

---

## Flow 3: An editor publishes a draft

1. The Publish button is rendered when `entry.status !== "PUBLISHED"` (`workspace-dashboard.tsx:185-192`). It calls `statusMutation.mutateAsync("PUBLISHED")`.
2. `useChangeEntryStatusMutation` (`useEntryMutations.ts:51`) POSTs `{ status }` to `/api/knowledge/:id/status`.
3. `status/route.ts:26-30`, then `changeEntryStatus` (`knowledgeEntryService.ts:163-195`): scoped load, then the transition matrix (409), then `canTransitionEntry` (403), then a transaction with the status update and the audit row.
4. `updateKnowledgeEntryStatus` sets `publishedAt = new Date()` (`knowledgeEntryRepository.ts:352`).

**Exercises**
- **Goal:** Find the button the UI shows that the server always rejects.
  **Check:** For an **archived** entry, `status !== "PUBLISHED"` is true, so Publish is shown (`:185`). But `ARCHIVED -> PUBLISHED` is not in `allowedTransitions` (`src/lib/auth/permissions.ts:83-87`), so the click returns 409 "Cannot move an entry from ARCHIVED to PUBLISHED".
- **Goal:** Find what an editor's Save button does on a published entry.
  **Check:** The save path calls `updateMutation.mutateAsync(payload)` (`workspace-dashboard.tsx:116`), which calls `updateDraftEntry`. That function has no status check, so the published content changes immediately.

---

## Flow 4: Unauthorized curation is rejected

1. The curation form is rendered only for `userRole === "ADMIN"` (`workspace-dashboard.tsx:275`). An editor could still call the endpoint directly.
2. `useCurateEntryMutation` (`useEntryMutations.ts:70`) POSTs to `/api/knowledge/:id/curation`.
3. `curation/route.ts:27`: `requireApiRole(request, "ADMIN")`. `hasMinimumRole` fails and `AuthorizationError` is thrown.
4. `apiError` returns **403** `{ error: { code: "FORBIDDEN", message: "You do not have access to this resource" } }`.

**Exercises**
- **Goal:** Find the 409 an admin hits when curating the seeded draft.
  **Check:** "Incident Bridge Template" is a `DRAFT` (`prisma/seed.ts:139`). `curateEntry` throws `ConflictError("Only published entries can be curated")` (`knowledgeEntryService.ts:209-211`).

---

## Flow 5: Workspace ownership isolation

1. `WorkspaceDashboard` lists entries through `useWorkspaceEntries`, which calls `GET /api/knowledge/workspace?status=...`.
2. `src/app/api/knowledge/workspace/route.ts:18-32`: `requireApiRole("EDITOR")`, then `workspaceEntriesQuerySchema` (status array, page, `pageSize` at most 50, default 12).
3. `listWorkspaceKnowledgeEntries` (`knowledgeEntryService.ts:69-81`) re-checks `canCreateEntry` and passes `actorId` and `actorRole`.
4. `listWorkspaceEntries` (`knowledgeEntryRepository.ts:116-156`) adds `authorId` for non-admins, then runs `findMany` and `count` in parallel with the same `where`.
5. The response is `{ items, totalCount }`.

**Exercises**
- **Goal:** Find what the seeded editor's workspace shows.
  **Check:** The editor authored the two published entries (`prisma/seed.ts:76`, `:109`). The admin authored the draft (`:140`). So the editor's list shows 2 entries, and the admin's shows all 3.
- **Goal:** Find a single-entry read that is broader than the list.
  **Check:** `findWorkspaceEntryById` lets editors open **any published** entry (`knowledgeEntryRepository.ts:60-67`), even though the list only shows their own.
