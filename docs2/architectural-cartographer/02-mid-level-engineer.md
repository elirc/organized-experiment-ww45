# Mid-Level Engineer Guide

## Architecture Diagram

```text
Browser
  |
  | renders client dashboards
  v
Next.js App Router pages
  - / uses src/app/page.tsx:6-20
  - /workspace uses src/app/workspace/page.tsx:6-24
  - /entries/[slug] uses src/app/entries/[slug]/page.tsx:18-65
  |
  | client hooks call JSON endpoints
  v
API route handlers under src/app/api
  - search route: src/app/api/knowledge/search/route.ts:18-36
  - workspace list route: src/app/api/knowledge/workspace/route.ts:18-31
  - curation route: src/app/api/knowledge/[entryId]/curation/route.ts:24-36
  |
  | validate and authorize, then delegate
  v
Services
  - auth service: src/services/authService.ts:18-50
  - knowledge service: src/services/knowledgeEntryService.ts:39-231
  |
  | call repositories and run transactions
  v
Repositories + Prisma
  - db singleton: src/lib/db.ts:1-15
  - schema: prisma/schema.prisma:18-119
  - knowledge queries: src/repositories/knowledgeEntryRepository.ts:34-425
```

## Type System Deep Dive

The app has three layers of types. Database enums come from Prisma: `EntryStatus` and `UserRole` are declared in `prisma/schema.prisma:18-28` and imported by UI/business code in `src/components/knowledge/workspace-dashboard.tsx:3` and `src/lib/auth/permissions.ts:11`. Validation types come from Zod inference in `src/lib/validation/knowledgeEntrySchemas.ts:67-71`. Client response types are hand-authored in `src/types/knowledge.ts:3-44`.

Annotated example from `src/lib/validation/knowledgeEntrySchemas.ts:37-54`:

```ts
export const saveKnowledgeEntrySchema = z
  .object({
    title: z.string().trim().min(5).max(120), // Product rule: an entry title must be useful.
    slug: z.string().trim().max(140).optional(), // Slug may be omitted and derived.
    summary: z.string().trim().min(20).max(240), // Search cards need a real summary.
    content: z.string().trim().min(40), // A knowledge entry cannot be empty.
    tags: z.array(tagSchema).min(1).max(6), // Entries need classification, but not tag spam.
  })
  .transform((value) => ({
    ...value,
    slug: slugify(value.slug?.length ? value.slug : value.title), // Normalize at the boundary.
    tags: value.tags.map((tag) => tag.trim()),
  }))
  .refine((value) => value.slug.length >= 3, {
    message: "Title or slug must generate at least 3 characters",
    path: ["slug"],
  });
```

## State Management Deep Dive

Search state has a local half and a server-cache half. The local half is `query`, `selectedTags`, and `featuredOnly` in `src/components/knowledge/search-dashboard.tsx:14-18`. The server-cache half is the React Query result from `useKnowledgeSearch()` in `src/components/knowledge/search-dashboard.tsx:19-26` and `src/hooks/useKnowledgeSearch.ts:30-33`.

The mental model: local state is the librarian's current question; React Query is the catalog request and cached answer.

```tsx
const [query, setQuery] = useState(""); // Browser-only input text.
const [selectedTags, setSelectedTags] = useState<string[]>([]); // Browser-only filter chips.
const [featuredOnly, setFeaturedOnly] = useState(false); // Browser-only toggle.

const searchQuery = useKnowledgeSearch({
  q: query, // Sent to the API as q.
  tags: selectedTags, // Sent as repeated tags query params.
  featuredOnly, // Sent only when true.
  page: 1,
  pageSize: 12,
});
```

Source: `src/components/knowledge/search-dashboard.tsx:14-26`.

## API Contract Map

- `POST /api/auth/login`: validates `loginSchema` in `src/app/api/auth/login/route.ts:6-10`, sets the session cookie in `src/app/api/auth/login/route.ts:11-24`.
- `POST /api/auth/logout`: reads the cookie manually and clears it in `src/app/api/auth/logout/route.ts:5-27`.
- `GET /api/me`: requires a session and returns `user` plus `expiresAt` in `src/app/api/me/route.ts:6-16`.
- `GET /api/tags`: returns tag summaries from `listAvailableTags()` in `src/app/api/tags/route.ts:4-10`.
- `GET /api/knowledge/search`: requires any session, parses search query, returns ranked entries in `src/app/api/knowledge/search/route.ts:18-36`.
- `GET /api/knowledge/workspace`: requires editor or admin, parses workspace filters, returns visible workspace entries in `src/app/api/knowledge/workspace/route.ts:18-31`.
- `POST /api/knowledge`: requires editor or admin, validates save payload, creates a draft in `src/app/api/knowledge/route.ts:18-28`.
- `GET/PATCH /api/knowledge/[entryId]`: reads or updates a workspace entry in `src/app/api/knowledge/[entryId]/route.ts:14-38`.
- `POST /api/knowledge/[entryId]/status`: validates `EntryStatus` and changes workflow state in `src/app/api/knowledge/[entryId]/status/route.ts:24-34`.
- `POST /api/knowledge/[entryId]/curation`: requires admin and changes ranking controls in `src/app/api/knowledge/[entryId]/curation/route.ts:24-36`.

## Component Interaction Map

`SearchDashboard` renders `AppHeader`, filter controls, tag buttons, result cards, loading state, and empty state in `src/components/knowledge/search-dashboard.tsx:28-173`. `AppHeader` shows role and navigation in `src/components/layout/app-header.tsx:8-36`. The workspace page renders `WorkspaceDashboard` only after rejecting viewers in `src/app/workspace/page.tsx:6-24`. `WorkspaceDashboard` composes the entry list and `WorkspaceEditorPanel` in `src/components/knowledge/workspace-dashboard.tsx:354-466`. The editor panel invokes create, update, status, and curation mutations declared in `src/hooks/useEntryMutations.ts:14-87`.

## Full-Stack Feature Trace: Ranked Search

1. User types in the search box bound to `query` in `src/components/knowledge/search-dashboard.tsx:44-50`.
2. User toggles tags in `src/components/knowledge/search-dashboard.tsx:65-90`.
3. `useKnowledgeSearch()` builds `URLSearchParams` in `src/hooks/useKnowledgeSearch.ts:14-29`.
4. React Query calls `/api/knowledge/search` in `src/hooks/useKnowledgeSearch.ts:30-33`.
5. The route requires a session before ranking work in `src/app/api/knowledge/search/route.ts:18-22`.
6. The route parses query params with `searchEntriesQuerySchema` in `src/app/api/knowledge/search/route.ts:23-29`.
7. The service delegates search to the repository without inventing route-level ranking in `src/services/knowledgeEntryService.ts:39-47`.
8. The repository builds tag/featured filters in `src/repositories/knowledgeEntryRepository.ts:158-175`.
9. SQL computes weighted text rank in `src/repositories/knowledgeEntryRepository.ts:198-229`.
10. SQL adds featured/manual boost and sorts in `src/repositories/knowledgeEntryRepository.ts:244-253`.
11. Rows are converted to `SearchResultEntry[]` in `src/repositories/knowledgeEntryRepository.ts:256-263`.
12. Result cards render title, summary, tags, updated date, and score in `src/components/knowledge/search-dashboard.tsx:137-159`.

## Diff Reading Exercise

Hypothetical change: "Add a `department` filter to search."

Review path:

1. Does Prisma model the field? Check `prisma/schema.prisma:58-82`.
2. Does the query schema accept and constrain it? Check `src/lib/validation/knowledgeEntrySchemas.ts:23-29`.
3. Does the hook serialize it into `URLSearchParams`? Check `src/hooks/useKnowledgeSearch.ts:14-33`.
4. Does the API route parse it from `request.nextUrl.searchParams`? Check `src/app/api/knowledge/search/route.ts:23-29`.
5. Does the repository add the filter safely with `Prisma.sql`? Check the existing tag filter pattern in `src/repositories/knowledgeEntryRepository.ts:160-172`.
6. Does the UI render controls without pretending filtering happens client-side? Check `src/components/knowledge/search-dashboard.tsx:44-107`.

## Non-Obvious Patterns

- Permission checks are duplicated in useful layers: route-level role guards in `src/app/api/knowledge/route.ts:20` and service-level ownership/transition checks in `src/services/knowledgeEntryService.ts:83-231`.
- Repository ownership scoping protects against service refactors leaking drafts; the non-admin filter is in `src/repositories/knowledgeEntryRepository.ts:116-127`.
- Status transitions are centralized rather than scattered through buttons and routes in `src/lib/auth/permissions.ts:78-90`.
- Search ranking belongs in the repository because it is SQL-dependent and data-shaped in `src/repositories/knowledgeEntryRepository.ts:158-264`.
- Cache invalidation lives in mutation hooks so components do not manually refetch after writes (`src/hooks/useEntryMutations.ts:23-87`).

## Mid-Level Socratic Checkpoint

1. Why does search ranking live in `src/repositories/knowledgeEntryRepository.ts:158-264` instead of `src/components/knowledge/search-dashboard.tsx:137-159`?
2. What failure does `src/repositories/knowledgeEntryRepository.ts:116-127` prevent?
3. Why does `src/services/knowledgeEntryService.ts:94-118` use a transaction for creating entries?
4. What cache keys must be invalidated after curation according to `src/hooks/useEntryMutations.ts:79-84`?
5. Where would you add a new workflow status, based on `prisma/schema.prisma:24-28` and `src/lib/auth/permissions.ts:83-90`?
6. How does `apiClient()` convert backend errors into UI errors in `src/lib/http/client.ts:13-19`?
7. Why is `manualBoost` capped in `src/lib/validation/knowledgeEntrySchemas.ts:60-64`?
8. What part of `/workspace` access is enforced by the server page versus the API route in `src/app/workspace/page.tsx:7-15` and `src/app/api/knowledge/workspace/route.ts:18-31`?

How to self-grade:

- Strong answers cross at least two layers.
- Strong answers distinguish authorization, validation, business rules, and data access.
- Strong answers name concrete files and line ranges.
- Strong answers describe what would go wrong if the rule moved to the wrong layer.

