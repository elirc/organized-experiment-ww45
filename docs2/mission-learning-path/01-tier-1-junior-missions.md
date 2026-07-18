# Tier 1 Junior Missions

### Mission 1: The App's Heartbeat
**Tier:** Junior
**Time Estimate:** 25 minutes
**Goal:** Explain how every page receives React Query support.
**The Concept:** The layout is the building foundation; providers are the power lines for the knowledge library.
**Design Intent Before You Read the Code:** `src/app/layout.tsx` owns the HTML shell, and `src/components/providers/app-providers.tsx` owns client data infrastructure. If this is wrong, hooks fail or caches reset.
**Find It In The Code:** Open `src/app/layout.tsx:23-35` and `src/components/providers/app-providers.tsx:7-24`.

```tsx
<body>
  {/* Every page gets the same client-data wrapper. */}
  <AppProviders>{children}</AppProviders>
</body>
```

```tsx
const [queryClient] = useState(() => new QueryClient({
  // Keep one catalog cache instead of making a new cache on every render.
  defaultOptions: { queries: { staleTime: 30_000 } },
}));
```

**The Aha Moment:** Client hooks work because the server layout wraps the whole app in one stable query provider.
**Socratic Checkpoint:** Why is `useState` used for the query client? What does `children` represent? What breaks if `AppProviders` is removed? Why does this file need `"use client"`? What does `staleTime` change?
How to self-grade: strong answers cite `src/components/providers/app-providers.tsx:1-24` and explain cache stability.
**Connects To:** Mission 7, because data fetching depends on this provider.

### Mission 2: The Folder Mental Map
**Tier:** Junior
**Time Estimate:** 30 minutes
**Goal:** Draw the codebase from page to database.
**The Concept:** Treat the app like a knowledge library: signs are routes, desks are services, shelves are repositories, and the catalog schema is Prisma.
**Design Intent Before You Read the Code:** Folders separate responsibilities. If you cannot name the owner, debugging turns into random clicking.
**Find It In The Code:** Open `src/app/page.tsx:6-20`, `src/hooks/useKnowledgeSearch.ts:14-33`, `src/app/api/knowledge/search/route.ts:18-36`, `src/services/knowledgeEntryService.ts:39-47`, and `src/repositories/knowledgeEntryRepository.ts:158-264`.

```ts
// UI -> hook -> route -> service -> repository is the main reading path.
const result = await searchKnowledgeBase(parsedQuery); // route delegates instead of doing SQL
```

**The Aha Moment:** Most features travel through the same layered path.
**Socratic Checkpoint:** Which folder owns pages? Which owns reusable UI? Which owns API calls? Which owns business rules? Which owns SQL?
How to self-grade: strong answers map at least five folders with one cited file each.
**Connects To:** Mission 14, because end-to-end tracing needs folder fluency.

### Mission 3: TypeScript Is a Contract
**Tier:** Junior
**Time Estimate:** 30 minutes
**Goal:** Explain how types protect UI, API input, and domain rules.
**The Concept:** Types are shelf labels; they stop a runbook from being mistaken for a user session.
**Design Intent Before You Read the Code:** Types come from Prisma, Zod, and shared DTO files. Poor type placement causes duplicated contracts.
**Find It In The Code:** Open `prisma/schema.prisma:18-28`, `src/types/knowledge.ts:3-44`, and `src/lib/validation/knowledgeEntrySchemas.ts:67-71`.

```ts
export type WorkspaceEntry = {
  id: string; // UI identity for selection and cache keys.
  status: EntryStatus; // Prisma enum, not a random string.
  tags: string[]; // UI receives tag names, not join-table rows.
};
```

**The Aha Moment:** The app uses different contracts for database shape, validated input, and UI response shape.
**Socratic Checkpoint:** Where does `EntryStatus` come from? Why infer Zod types? Why does the UI use `WorkspaceEntry`? What is a DTO? What risk comes from typing JSON dates as `Date`?
How to self-grade: strong answers distinguish Prisma model, Zod input, and UI response.
**Connects To:** Mission 17, because TypeScript does hidden work across layers.

### Mission 4: Your First React Component
**Tier:** Junior
**Time Estimate:** 20 minutes
**Goal:** Annotate a small reusable UI component.
**The Concept:** A component is a stamp used repeatedly on entries, roles, and statuses.
**Design Intent Before You Read the Code:** `Badge` should restrict visual states and keep class merging centralized. If it accepts anything, the UI becomes inconsistent.
**Find It In The Code:** Open `src/components/ui/badge.tsx:3-23`.

```tsx
export function Badge({ children, tone = "neutral" }: {
  children: React.ReactNode; // Caller supplies displayed content.
  tone?: "neutral" | "accent" | "success" | "warning"; // Only approved badge tones.
}) {
  return <span className={cn(/* tone maps to classes */)}>{children}</span>;
}
```

**The Aha Moment:** Small components encode design rules as TypeScript constraints.
**Socratic Checkpoint:** What is `children`? What does `tone?` mean? Where is `Badge` used? Why use `cn()`? What happens if a new status needs a new color?
How to self-grade: strong answers cite `src/components/layout/app-header.tsx:21-31` or `src/components/knowledge/search-dashboard.tsx:143-148` as usage.
**Connects To:** Mission 6, because props are typed contracts.

### Mission 5: Your First Node.js Route
**Tier:** Junior
**Time Estimate:** 25 minutes
**Goal:** Explain a simple API route from request to response.
**The Concept:** A route is the front desk: it accepts a request, asks the right department, and returns a standard answer.
**Design Intent Before You Read the Code:** Routes should stay thin. If routes start doing database work, rules scatter.
**Find It In The Code:** Open `src/app/api/tags/route.ts:4-10` and `src/services/tagService.ts:3-10`.

```ts
export async function GET() {
  try {
    const tags = await listAvailableTags(); // service chooses response shape
    return apiOk(tags); // standard success envelope
  } catch (error) {
    return apiError(error); // standard failure envelope
  }
}
```

**The Aha Moment:** Even tiny routes follow the success/error response pattern.
**Socratic Checkpoint:** Why call a service? What does `apiOk` wrap? What does `apiError` catch? Where are tags sorted? What would you test?
How to self-grade: strong answers cite `src/repositories/tagRepository.ts:8-11` for sorting.
**Connects To:** Mission 12, because routes become the API contract.

### Mission 6: Props Are a Typed Contract
**Tier:** Junior
**Time Estimate:** 25 minutes
**Goal:** Explain how session props drive navigation.
**The Concept:** Props are the ID badge passed from server desk to UI desk.
**Design Intent Before You Read the Code:** `AppHeader` needs session role to show workspace access. If props are loose, viewers may see wrong affordances.
**Find It In The Code:** Open `src/components/layout/app-header.tsx:6-36` and `src/types/knowledge.ts:36-44`.

```tsx
export function AppHeader({ session }: { session: SessionSummary }) {
  // Role comes from the authenticated server session.
  {session.user.role !== "VIEWER" ? <Link href="/workspace">...</Link> : null}
}
```

**The Aha Moment:** A prop type can document both shape and product rule inputs.
**Socratic Checkpoint:** What does `SessionSummary` contain? Why does the header need role? Is hiding workspace link enough security? Where is server protection? What role sees curation?
How to self-grade: strong answers mention `src/app/workspace/page.tsx:13-15` as server protection.
**Connects To:** Mission 13, because role checks repeat on API boundaries.

### Mission 7: Following Data Into the App
**Tier:** Junior
**Time Estimate:** 35 minutes
**Goal:** Trace search data from filters to rendered cards.
**The Concept:** The filter panel is a catalog request form; React Query fetches the matching shelf cards.
**Design Intent Before You Read the Code:** Local filters must become URL params, not ad hoc global state. If serialization is wrong, search lies.
**Find It In The Code:** Open `src/components/knowledge/search-dashboard.tsx:14-26`, `src/hooks/useKnowledgeSearch.ts:14-33`, and `src/components/knowledge/search-dashboard.tsx:137-159`.

```ts
filters.tags.forEach((tag) => searchParams.append("tags", tag)); // repeated query params
return useQuery({
  queryKey: ["knowledge-search", filters], // cache identity includes filters
  queryFn: () => apiClient<SearchResponse>(`/api/knowledge/search?${searchParams.toString()}`),
});
```

**The Aha Moment:** The cache key and URL params must describe the same question.
**Socratic Checkpoint:** Why append tags instead of joining? Why include filters in queryKey? Where is loading shown? Where is empty state shown? Where is score rendered?
How to self-grade: strong answers cite `src/components/knowledge/search-dashboard.tsx:130-168`.
**Connects To:** Mission 9, because state needs a home.

### Mission 8: Navigation Is the App's Skeleton
**Tier:** Junior
**Time Estimate:** 25 minutes
**Goal:** Identify how users move through the app.
**The Concept:** Routes are rooms in the knowledge hub; links and redirects decide who enters.
**Design Intent Before You Read the Code:** Public navigation must still be backed by server checks. If links are the only guard, permissions are cosmetic.
**Find It In The Code:** Open `src/app/page.tsx:6-20`, `src/app/login/page.tsx:6-20`, `src/app/workspace/page.tsx:6-24`, `src/app/entries/[slug]/page.tsx:18-65`, and `src/components/layout/app-header.tsx:21-31`.

```tsx
if (!session) redirect("/login"); // server guard
if (session.user.role === "VIEWER") redirect("/"); // role guard
```

**The Aha Moment:** Navigation is both UI links and server-side route protection.
**Socratic Checkpoint:** Which pages require login? Which page rejects viewers? Where do entry links go? What page redirects signed-in users away from login? Which component renders nav links?
How to self-grade: strong answers name all four page files with line ranges.
**Connects To:** Mission 13, because API routes need their own guards.

