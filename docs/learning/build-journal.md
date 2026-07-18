# Build Journal

## Stage 1 — Project framing
- Built the application as a single-organization internal knowledge base rather than multi-tenant SaaS.
- Decision logged in code: ownership isolation lives in `listWorkspaceEntries()` and `findEditableEntryById()` inside `src/repositories/knowledgeEntryRepository.ts`.
- Why: the requirements asked for strong auth and permissions, but not tenant isolation. Adding `tenantId` later would touch repository filters and schema relations, not require a full rewrite.

## Stage 2 — Data layer and search strategy
- Options considered:
  - Prisma only with simple `contains` search: easy CRUD, weak ranking, unrealistic search quality.
  - Drizzle with SQL-first queries: powerful, but a heavier learning curve for a full product app.
  - Prisma for CRUD plus parameterized raw SQL for ranked search.
- Chosen option: Prisma plus raw SQL in `src/repositories/knowledgeEntryRepository.ts`.
- Why this mattered: search ranking is a real backend concern here, and the product requirement explicitly called for ranking and curation.
- Why this won: `prisma/schema.prisma` stays approachable for CRUD and relations, while `searchPublishedEntries()` can still use PostgreSQL full-text ranking and a GIN index defined in `prisma/migrations/20260416000000_initial_schema/migration.sql`.
- Junior / mid / senior lens:
  - Junior often optimizes for “keep everything in the ORM.”
  - Mid-level notices when an escape hatch is justified.
  - Senior cares that the escape hatch is narrow, parameterized, and lives in the repository layer.

## Stage 3 — Auth and RBAC
- Options considered:
  - External auth package with opaque callbacks.
  - JWT-only stateless auth.
  - Custom database-backed session cookies with explicit RBAC utilities.
- Chosen option: database-backed sessions via `src/services/authService.ts`, `src/lib/auth/session.ts`, and `src/lib/auth/apiAuth.ts`.
- Why this mattered: the teaching goal is to show where session verification and role enforcement actually happen.
- Why this won: the flow is explicit end to end, and deleting or expiring a session row immediately invalidates the cookie.
- Junior / mid / senior lens:
  - Junior notices the login route.
  - Mid-level traces cookie issuance and lookup.
  - Senior worries about revocation, 401 vs 403 semantics, and reusable guard boundaries.

## Stage 4 — Service and repository boundaries
- Built `src/services/knowledgeEntryService.ts` and `src/repositories/knowledgeEntryRepository.ts` as distinct layers.
- Why: CRUD apps become unreviewable when route handlers own policy and queries at the same time.
- What changed: routes now validate and delegate; services own rules; repositories own Prisma/raw SQL access.

## Stage 5 — Editorial workflow and curation
- Added draft/published/archived states in `prisma/schema.prisma`.
- Added transition rules in `src/lib/auth/permissions.ts`.
- Added curation policy in `curateEntry()` inside `src/services/knowledgeEntryService.ts`.
- Why: the product requirements were not just CRUD; they needed admin curation and ranking control.

## Stage 6 — UI and client data flow
- Added React Query hooks in `src/hooks`.
- Built search UI in `src/components/knowledge/search-dashboard.tsx`.
- Built workspace UI in `src/components/knowledge/workspace-dashboard.tsx`.
- Why: the UI needed to stay thin enough that backend flow traces are still readable.

## Stage 7 — Tests and docs
- Added focused tests in `src/tests`.
- Wrote architecture docs in `docs/architecture`.
- Wrote learning docs in `docs/learning`.
- Why: this project is meant to be read and learned from, not just run.

## PR Slices

### Slice 1 — Persistence model, seed data, and search indexing
- Purpose in one sentence: Establish the schema, demo data, and database structures that make ranking and workflow possible.
- Novel logic files:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260416000000_initial_schema/migration.sql`
  - `prisma/seed.ts`
- Reviewer focus:
  - `prisma/schema.prisma`: verify `UserRole`, `EntryStatus`, and `KnowledgeEntry` curation fields near the middle of the file.
  - `prisma/migrations/20260416000000_initial_schema/migration.sql`: verify the `KnowledgeEntry_search_idx` expression near the end of the file.
- What a junior reviewer might approve too quickly: a schema that stores workflow or curation state in generic JSON instead of explicit columns and enums.

### Slice 2 — Auth, sessions, and permission guards
- Purpose in one sentence: Make auth and RBAC explicit before building any entry mutations.
- Novel logic files:
  - `src/lib/auth/session.ts`
  - `src/lib/auth/apiAuth.ts`
  - `src/lib/auth/permissions.ts`
  - `src/services/authService.ts`
  - `src/app/api/auth/login/route.ts`
- Reviewer focus:
  - `src/lib/auth/session.ts`: verify expired-session invalidation in `getSessionFromToken()`.
  - `src/lib/auth/apiAuth.ts`: verify `requireApiRole()` preserves 401 vs 403 semantics.
  - `src/lib/auth/permissions.ts`: verify editor ownership rules in `canEditEntry()` and `canReadEntryInWorkspace()`.
- What a junior reviewer might approve too quickly: trusting the cookie without loading the backing session row.

### Slice 3 — Knowledge entry services, repositories, and workflow rules
- Purpose in one sentence: Build the backend core for search, draft mutations, publishing, archiving, and curation.
- Novel logic files:
  - `src/services/knowledgeEntryService.ts`
  - `src/repositories/knowledgeEntryRepository.ts`
  - `src/repositories/tagRepository.ts`
  - `src/repositories/auditLogRepository.ts`
  - `src/app/api/knowledge/search/route.ts`
  - `src/app/api/knowledge/[entryId]/status/route.ts`
  - `src/app/api/knowledge/[entryId]/curation/route.ts`
- Reviewer focus:
  - `src/services/knowledgeEntryService.ts`: verify transaction boundaries and policy order in `createDraftEntry()` and `changeEntryStatus()`.
  - `src/repositories/knowledgeEntryRepository.ts`: verify author scoping in `listWorkspaceEntries()` and published-only filtering in `searchPublishedEntries()`.
  - `src/app/api/knowledge/[entryId]/curation/route.ts`: verify the admin role check happens before the service call.
- What a junior reviewer might approve too quickly: a service method that checks role but forgets ownership or current status.

### Slice 4 — Search and editorial UI
- Purpose in one sentence: Expose the backend through a thin but realistic search experience and workspace surface.
- Novel logic files:
  - `src/components/knowledge/search-dashboard.tsx`
  - `src/components/knowledge/workspace-dashboard.tsx`
  - `src/hooks/useKnowledgeSearch.ts`
  - `src/hooks/useEntryMutations.ts`
  - `src/app/entries/[slug]/page.tsx`
- Reviewer focus:
  - `src/components/knowledge/search-dashboard.tsx`: verify the filter state matches the query string generation in `useKnowledgeSearch()`.
  - `src/components/knowledge/workspace-dashboard.tsx`: verify the component reflects server capabilities without duplicating permission rules.
- What a junior reviewer might approve too quickly: UI-only hiding of admin controls without server-side enforcement.

### Slice 5 — Tests and teaching docs
- Purpose in one sentence: Lock down the highest-risk behaviors and explain how to read the codebase.
- Novel logic files:
  - `src/tests/api/knowledge-curation-route.test.ts`
  - `src/tests/services/knowledge-entry-status.test.ts`
  - `src/tests/repositories/workspace-scope.test.ts`
  - `docs/architecture/*`
  - `docs/learning/*`
- Reviewer focus:
  - `src/tests/repositories/workspace-scope.test.ts`: verify the assertion actually checks the author filter rather than just counting calls.
  - `docs/learning/flow-traces.md`: verify each trace names the real file and function boundaries.
- What a junior reviewer might approve too quickly: docs that describe the intended architecture instead of the actual file paths and functions in the repo.
