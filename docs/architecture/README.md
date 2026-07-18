# Architecture Overview

Knowledge Hub is a single-organization internal knowledge base with explicit auth, RBAC, search ranking, and editorial workflow controls. The codebase is intentionally split so request boundaries, business rules, and database access are easy to review separately.

## Top-level folders

- `prisma/`
  Uses [`prisma/schema.prisma`](../../prisma/schema.prisma) for the database model, [`prisma/migrations/20260416000000_initial_schema/migration.sql`](../../prisma/migrations/20260416000000_initial_schema/migration.sql) for the initial schema, and [`prisma/seed.ts`](../../prisma/seed.ts) for demo users, tags, and entries.
- `src/app/`
  Owns pages and REST endpoints. Examples: [`src/app/page.tsx`](../../src/app/page.tsx) loads the authenticated search UI, and [`src/app/api/knowledge/search/route.ts`](../../src/app/api/knowledge/search/route.ts) handles ranked search requests.
- `src/components/`
  Holds UI-only composition. [`src/components/knowledge/search-dashboard.tsx`](../../src/components/knowledge/search-dashboard.tsx) renders search filters and results, while [`src/components/knowledge/workspace-dashboard.tsx`](../../src/components/knowledge/workspace-dashboard.tsx) drives the editor/admin surface.
- `src/hooks/`
  Encapsulates client-side data fetching and mutations. [`src/hooks/useKnowledgeSearch.ts`](../../src/hooks/useKnowledgeSearch.ts) and [`src/hooks/useEntryMutations.ts`](../../src/hooks/useEntryMutations.ts) are the main React Query entry points.
- `src/lib/`
  Shared boundaries and infrastructure. [`src/lib/auth/apiAuth.ts`](../../src/lib/auth/apiAuth.ts) owns API auth guards, [`src/lib/validation/knowledgeEntrySchemas.ts`](../../src/lib/validation/knowledgeEntrySchemas.ts) owns request validation, and [`src/lib/http/responses.ts`](../../src/lib/http/responses.ts) normalizes API responses.
- `src/services/`
  Owns business rules. [`src/services/knowledgeEntryService.ts`](../../src/services/knowledgeEntryService.ts) applies permission checks, workflow transitions, and transactions before calling repositories.
- `src/repositories/`
  Owns database access. [`src/repositories/knowledgeEntryRepository.ts`](../../src/repositories/knowledgeEntryRepository.ts) handles CRUD plus the PostgreSQL full-text ranking query; [`src/repositories/sessionRepository.ts`](../../src/repositories/sessionRepository.ts) backs session lookup.
- `src/tests/`
  Keeps focused tests around auth rejection, validation, status transitions, and ownership scoping. See [`src/tests/api/knowledge-curation-route.test.ts`](../../src/tests/api/knowledge-curation-route.test.ts) and [`src/tests/repositories/workspace-scope.test.ts`](../../src/tests/repositories/workspace-scope.test.ts).

## Layer relationship

Requests typically move in this order:

1. A page or client hook in `src/app` or `src/hooks`
2. An API route in `src/app/api`
3. Auth guards in `src/lib/auth`
4. Zod schemas in `src/lib/validation`
5. Business logic in `src/services`
6. Queries and transactions in `src/repositories`
7. Prisma + PostgreSQL in `prisma/`

The most important design choice is that ranking, permissions, and state transitions live on the server. React components call APIs and render results, but they do not decide who can publish, who can curate, or how search is ordered.
