# Tier 2 Mid-Level Missions

### Mission 9: State Has a Home and a Reason
**Tier:** Mid-Level
**Time Estimate:** 35 minutes
**Goal:** Separate local UI state from server cache state.
**The Concept:** Local state is the question on the search slip; React Query state is the catalog's answer.
**Design Intent Before You Read the Code:** Filters belong in the component, data belongs in React Query. Mixing them makes refresh and cache invalidation messy.
**Find It In The Code:** `src/components/knowledge/search-dashboard.tsx:14-26`, `src/hooks/useKnowledgeSearch.ts:30-33`.

```tsx
const [query, setQuery] = useState(""); // local input state
const searchQuery = useKnowledgeSearch({ q: query, tags: selectedTags, featuredOnly, page: 1, pageSize: 12 }); // server state
```

**The Aha Moment:** A state variable needs an owner because different owners have different lifecycles.
**Socratic Checkpoint:** Which state resets on refresh? Which state is cached? What makes the cache key unique? What state is missing for pagination? What would debouncing change?
How to self-grade: strong answers cite both component and hook line ranges.
**Connects To:** Mission 10 and Mission 11.

### Mission 10: The Custom Hook Ecosystem
**Tier:** Mid-Level
**Time Estimate:** 45 minutes
**Goal:** Map all custom hooks to their API endpoints.
**The Concept:** Hooks are catalog request forms with reusable labels.
**Design Intent Before You Read the Code:** Hooks keep endpoints out of components. If components call raw fetch everywhere, cache behavior fragments.
**Find It In The Code:** `src/hooks/useKnowledgeSearch.ts:14-33`, `src/hooks/useWorkspaceEntries.ts:14-22`, `src/hooks/useWorkspaceEntry.ts:8-13`, `src/hooks/useTags.ts:13-17`, `src/hooks/useSession.ts:8-13`, `src/hooks/useEntryMutations.ts:14-87`.

```ts
return useQuery({
  queryKey: ["workspace-entries", statuses], // cache bucket
  queryFn: () => apiClient<WorkspaceResponse>(`/api/knowledge/workspace?${searchParams.toString()}`), // endpoint
});
```

**The Aha Moment:** The hook name tells you which piece of server state it owns.
**Socratic Checkpoint:** Which hook reads tags? Which hook reads current session? Which hook writes curation? Which hooks invalidate search? Which query is disabled until an id exists?
How to self-grade: strong answers cite `src/hooks/useWorkspaceEntry.ts:8-13` for the enabled condition.
**Connects To:** Mission 14 and Mission 23.

### Mission 11: Side Effects Are Promises to the System
**Tier:** Mid-Level
**Time Estimate:** 40 minutes
**Goal:** Explain mutation side effects and cache invalidation.
**The Concept:** Updating an entry is like changing a library card and then telling every catalog drawer to refresh.
**Design Intent Before You Read the Code:** Mutations must update server state and invalidate affected cached reads. Forgetting invalidation makes stale UI.
**Find It In The Code:** `src/hooks/useEntryMutations.ts:14-87`.

```ts
onSuccess: async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["workspace-entries"] }), // list may change
    queryClient.invalidateQueries({ queryKey: ["knowledge-entry", entryId] }), // detail may change
    queryClient.invalidateQueries({ queryKey: ["knowledge-search"] }), // public search may change
  ]);
}
```

**The Aha Moment:** A write has blast radius beyond the form that submitted it.
**Socratic Checkpoint:** Why does create invalidate search? Why does update invalidate detail? Why does status invalidate workspace list? Why does curation invalidate search? What cache key risk do string literals create?
How to self-grade: strong answers connect each invalidation to a rendered view.
**Connects To:** Mission 15 and Mission 23.

### Mission 12: The Full API Contract
**Tier:** Mid-Level
**Time Estimate:** 50 minutes
**Goal:** Build an endpoint map with guards, schemas, services, and responses.
**The Concept:** The API is the service counter; each endpoint needs ID check, form validation, and a receipt.
**Design Intent Before You Read the Code:** Routes should be thin and predictable. A route that hides business logic is hard to audit.
**Find It In The Code:** `src/app/api/auth/login/route.ts:6-28`, `src/app/api/me/route.ts:6-16`, `src/app/api/knowledge/search/route.ts:18-36`, `src/app/api/knowledge/route.ts:18-28`, `src/app/api/knowledge/[entryId]/route.ts:14-38`, `src/app/api/knowledge/[entryId]/status/route.ts:24-34`, `src/app/api/knowledge/[entryId]/curation/route.ts:24-36`.

```ts
const session = await requireApiRole(request, "EDITOR"); // guard
const body = saveKnowledgeEntrySchema.parse(await request.json()); // schema
const entry = await updateDraftEntry(session.user, entryId, body); // service
return apiOk(entry); // response
```

**The Aha Moment:** Most endpoints follow guard -> parse -> service -> response.
**Socratic Checkpoint:** Which endpoints require any session? Which require editor? Which require admin? Which schemas parse bodies? Which routes parse URL params?
How to self-grade: strong answers produce a table with one row per endpoint.
**Connects To:** Mission 13 and Mission 14.

### Mission 13: The Middleware Chain
**Tier:** Mid-Level
**Time Estimate:** 40 minutes
**Goal:** Trace auth from cookie to role decision.
**The Concept:** Auth is the security desk before the knowledge stacks.
**Design Intent Before You Read the Code:** Anonymous and under-privileged requests must fail differently. Repeated ad hoc checks cause inconsistent security.
**Find It In The Code:** `src/lib/auth/session.ts:30-74`, `src/lib/auth/apiAuth.ts:19-43`, `src/lib/auth/permissions.ts:20-90`.

```ts
const token = request.cookies.get(env.SESSION_COOKIE_NAME)?.value; // cookie input
const session = await getSessionFromToken(token); // database-backed session
if (!hasMinimumRole(session.user.role, minimumRole)) throw new AuthorizationError(); // role threshold
```

**The Aha Moment:** Auth is not one check; it is cookie, session row, expiration, role, and sometimes ownership.
**Socratic Checkpoint:** Where is the cookie read? Where are expired sessions deleted? Where is role order declared? Where are ownership rules declared? Why separate 401 and 403?
How to self-grade: strong answers cite `src/lib/errors.ts:22-31` for 401/403 classes.
**Connects To:** Mission 18 and Mission 22.

### Mission 14: End-to-End Feature Trace
**Tier:** Mid-Level
**Time Estimate:** 60 minutes
**Goal:** Trace ranked search from UI to database and back.
**The Concept:** A search request is a library patron asking the catalog, which ranks shelves by title, summary, content, tag, featured placement, and freshness.
**Design Intent Before You Read the Code:** Search quality belongs near the data, not in frontend sorting.
**Find It In The Code:** `src/components/knowledge/search-dashboard.tsx:44-159`, `src/hooks/useKnowledgeSearch.ts:14-33`, `src/app/api/knowledge/search/route.ts:18-36`, `src/services/knowledgeEntryService.ts:39-47`, `src/repositories/knowledgeEntryRepository.ts:158-264`.

```sql
-- score is text rank plus product curation
("textRank" + CASE WHEN "isFeatured" THEN 1.5 ELSE 0 END + ("manualBoost" * 0.15)) AS "score"
```

**The Aha Moment:** The UI displays score, but the repository owns how score is earned.
**Socratic Checkpoint:** Where does typing start? Where is the URL built? Where is auth checked? Where is text search computed? Where is score rendered?
How to self-grade: strong answers give a numbered trace with all five files.
**Connects To:** Mission 21 and Mission 22.

### Mission 15: Read the Diff Like an Engineer
**Tier:** Mid-Level
**Time Estimate:** 45 minutes
**Goal:** Review a hypothetical feature diff for a new `department` filter.
**The Concept:** A diff is a map of promises; your job is to find promises that do not connect.
**Design Intent Before You Read the Code:** A new filter must touch schema, hook serialization, route parsing, repository filtering, UI controls, and tests.
**Find It In The Code:** `prisma/schema.prisma:58-82`, `src/lib/validation/knowledgeEntrySchemas.ts:23-29`, `src/hooks/useKnowledgeSearch.ts:14-33`, `src/app/api/knowledge/search/route.ts:23-31`, `src/repositories/knowledgeEntryRepository.ts:160-175`.

```ts
// Existing pattern: collect many tag params.
tags: request.nextUrl.searchParams.getAll("tags"),
// A department filter should be parsed just as deliberately, not read ad hoc in SQL.
```

**The Aha Moment:** A good review follows the contract across every layer it claims to change.
**Socratic Checkpoint:** What happens if UI changes but schema does not? What if schema changes but hook does not? What if repository filters but count does not? What tests prove no draft leaks? What docs should update?
How to self-grade: strong answers include at least one failure mode per layer.
**Connects To:** Mission 19 and Mission 23.

### Mission 16: Composition Over Inheritance
**Tier:** Mid-Level
**Time Estimate:** 35 minutes
**Goal:** Explain how the UI composes small parts into screens.
**The Concept:** Entries are assembled like runbooks: badge, title, summary, metadata, controls.
**Design Intent Before You Read the Code:** Components should compose props and children rather than subclass behavior.
**Find It In The Code:** `src/components/ui/button.tsx:5-26`, `src/components/ui/badge.tsx:3-23`, `src/components/layout/app-header.tsx:8-36`, `src/components/knowledge/workspace-dashboard.tsx:455-461`.

```tsx
<WorkspaceEditorPanel
  entry={selectedEntry} // selected record
  entryId={effectiveEntryId} // mutation target
  userRole={session.user.role} // permission-shaped UI
  onEntrySelected={setSelectedEntryId} // parent owns selection
/>
```

**The Aha Moment:** The parent owns workflow state; child components receive enough data to do one job.
**Socratic Checkpoint:** Which component owns selected entry id? Which owns form state? Which owns header nav? Which components are pure UI? What would be over-abstracted here?
How to self-grade: strong answers cite `src/components/knowledge/workspace-dashboard.tsx:354-466`.
**Connects To:** Mission 18.

### Mission 17: TypeScript's Hidden Work
**Tier:** Mid-Level
**Time Estimate:** 45 minutes
**Goal:** Identify where TypeScript prevents invalid states.
**The Concept:** TypeScript is the catalog rule that says a draft status cannot be spelled five ways.
**Design Intent Before You Read the Code:** Use enums, inferred schemas, and prop contracts to shrink bug space.
**Find It In The Code:** `src/components/ui/button.tsx:5-7`, `src/lib/auth/permissions.ts:20-27`, `src/lib/validation/knowledgeEntrySchemas.ts:67-71`, `src/types/knowledge.ts:3-44`.

```ts
const roleOrder: Record<UserRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
}; // If a new UserRole is added, TypeScript forces this map to be updated.
```

**The Aha Moment:** Some of the best bugs are prevented before the code runs.
**Socratic Checkpoint:** What does `Record<UserRole, number>` guarantee? What do Zod inferred types guarantee? What do button variants guarantee? Where are types too optimistic? What happens when Prisma enum changes?
How to self-grade: strong answers identify date serialization as a weak spot in `src/types/knowledge.ts:11-12`.
**Connects To:** Mission 18 and Mission 23.

