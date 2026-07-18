# Reading Map

## Mental Model

Knowledge Hub is a guarded knowledge library. Viewers search published operational entries, editors draft and publish their own entries, and admins curate public ranking. Next.js routes are the building entrances (`src/app/page.tsx:6-20`, `src/app/workspace/page.tsx:6-24`), React Query is the librarian fetching and refreshing shelves (`src/hooks/useKnowledgeSearch.ts:30-33`, `src/hooks/useEntryMutations.ts:23-87`), services are policy desks (`src/services/knowledgeEntryService.ts:39-231`), repositories are catalog/database access (`src/repositories/knowledgeEntryRepository.ts:34-425`), and Prisma is the shelf map (`prisma/schema.prisma:18-119`).

## Top 10 Files To Read In Order

1. `README.md:1-43`
   - Why now: it names the product, stack, setup, demo accounts, and verification commands.
   - Understand before reading: this is an internal knowledge base, not a generic blog.
   - Explain after reading: what users can do and what tools power it.

2. `package.json:5-45`
   - Why now: scripts and dependencies reveal the build, test, ORM, UI, and validation stack.
   - Understand before reading: npm scripts are the local command surface.
   - Explain after reading: how to run, build, lint, test, migrate, and seed.

3. `prisma/schema.prisma:18-119`
   - Why now: the domain nouns are explicit: `UserRole`, `EntryStatus`, `User`, `Session`, `KnowledgeEntry`, `Tag`, `KnowledgeEntryTag`, `AuditLog`.
   - Understand before reading: Prisma models become generated TypeScript client APIs.
   - Explain after reading: why ranking fields live on `KnowledgeEntry`.

4. `src/app/layout.tsx:23-35`
   - Why now: every page passes through this layout.
   - Understand before reading: server layout components can wrap client providers.
   - Explain after reading: why `AppProviders` is available everywhere.

5. `src/components/providers/app-providers.tsx:7-24`
   - Why now: this creates the React Query cache for all client hooks.
   - Understand before reading: a `QueryClient` should be stable across renders.
   - Explain after reading: what `staleTime: 30_000` changes for reads.

6. `src/app/page.tsx:6-20`
   - Why now: this is the authenticated search entry point.
   - Understand before reading: `redirect()` on the server prevents rendering the dashboard.
   - Explain after reading: how a server session becomes a client prop.

7. `src/components/knowledge/search-dashboard.tsx:14-174`
   - Why now: it shows user controls, local state, hooks, and rendered results.
   - Understand before reading: `query`, `selectedTags`, and `featuredOnly` are UI state.
   - Explain after reading: how filters become search requests.

8. `src/hooks/useKnowledgeSearch.ts:14-33`
   - Why now: this is the client-side API contract for ranked search.
   - Understand before reading: React Query keys decide cache identity.
   - Explain after reading: why `tags` are appended repeatedly to `URLSearchParams`.

9. `src/app/api/knowledge/search/route.ts:18-36`
   - Why now: this is the backend boundary for search.
   - Understand before reading: routes should authenticate and validate before service calls.
   - Explain after reading: how query params become `SearchEntriesQuery`.

10. `src/repositories/knowledgeEntryRepository.ts:158-264`
   - Why now: this is the ranking engine.
   - Understand before reading: Prisma can execute parameterized raw SQL through `Prisma.sql`.
   - Explain after reading: how text rank, featured boost, manual boost, and freshness combine.

## Three Important Data Flows

1. Search: `src/components/knowledge/search-dashboard.tsx:14-26` -> `src/hooks/useKnowledgeSearch.ts:14-33` -> `src/app/api/knowledge/search/route.ts:18-36` -> `src/services/knowledgeEntryService.ts:39-47` -> `src/repositories/knowledgeEntryRepository.ts:158-264` -> results render in `src/components/knowledge/search-dashboard.tsx:137-159`.

2. Create/update entry: `src/components/knowledge/workspace-dashboard.tsx:97-127` -> `src/hooks/useEntryMutations.ts:14-48` -> `src/app/api/knowledge/route.ts:18-28` or `src/app/api/knowledge/[entryId]/route.ts:27-38` -> `src/services/knowledgeEntryService.ts:83-160` -> `src/repositories/knowledgeEntryRepository.ts:266-340`.

3. Curation: `src/components/knowledge/workspace-dashboard.tsx:275-348` -> `src/hooks/useEntryMutations.ts:70-87` -> `src/app/api/knowledge/[entryId]/curation/route.ts:24-36` -> `src/services/knowledgeEntryService.ts:197-231` -> `src/repositories/knowledgeEntryRepository.ts:370-401`.

## Pre-Reading Checklist

1. Can I name the route files for `/`, `/login`, `/workspace`, and `/entries/[slug]` from `src/app/page.tsx:6-20`, `src/app/login/page.tsx:6-20`, `src/app/workspace/page.tsx:6-24`, and `src/app/entries/[slug]/page.tsx:18-65`?
2. Can I explain the three roles from `prisma/schema.prisma:18-22`?
3. Can I explain the three entry statuses from `prisma/schema.prisma:24-28`?
4. Can I describe how the session cookie is set in `src/app/api/auth/login/route.ts:16-22`?
5. Can I describe how server pages read the session in `src/lib/auth/session.ts:30-39`?
6. Can I identify where API routes enforce roles in `src/lib/auth/apiAuth.ts:19-43`?
7. Can I identify where request payloads are validated in `src/lib/validation/knowledgeEntrySchemas.ts:23-71`?
8. Can I identify where the search score is computed in `src/repositories/knowledgeEntryRepository.ts:244-253`?
9. Can I explain what gets invalidated after mutations in `src/hooks/useEntryMutations.ts:23-87`?
10. Can I point to the local setup procedure in `README.md:22-28` and `.env.example:1-4`?

## Red Flags Checklist

- A route mutates data without `requireApiRole()` or `requireApiSession()`; compare against `src/app/api/knowledge/route.ts:18-28`.
- A route accepts JSON without a Zod schema; compare against `src/app/api/knowledge/[entryId]/route.ts:27-38`.
- UI-only permissions hide controls but do not enforce server rules; compare `src/components/knowledge/workspace-dashboard.tsx:275-348` with `src/app/api/knowledge/[entryId]/curation/route.ts:24-36`.
- A service writes without audit logging; compare `src/services/knowledgeEntryService.ts:94-118`, `src/services/knowledgeEntryService.ts:138-160`, and `src/services/knowledgeEntryService.ts:178-194`.
- A repository exposes drafts across users; compare `src/repositories/knowledgeEntryRepository.ts:116-156`.
- React Query mutations update data but do not invalidate related caches; compare `src/hooks/useEntryMutations.ts:23-87`.
- Search changes are made in the UI instead of the ranking query; compare `src/components/knowledge/search-dashboard.tsx:114-118` and `src/repositories/knowledgeEntryRepository.ts:244-253`.
- Slugs are normalized in multiple places instead of at the schema boundary; compare `src/lib/validation/knowledgeEntrySchemas.ts:37-54`.
- Expired sessions remain in the database; compare cleanup in `src/lib/auth/session.ts:48-51`.

