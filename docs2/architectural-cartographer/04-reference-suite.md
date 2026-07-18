# Reference Suite

## Doc 1: Junior Onboarding Guide

Start by running the setup documented in `README.md:22-28` with variables from `.env.example:1-4`. The app is an internal knowledge base with authenticated search, role-based access, workspace workflows, curation, and audit logging according to `README.md:5-12`.

Day-one reading order: `prisma/schema.prisma:18-119`, `src/app/layout.tsx:23-35`, `src/app/page.tsx:6-20`, `src/components/knowledge/search-dashboard.tsx:14-174`, `src/hooks/useKnowledgeSearch.ts:14-33`, `src/app/api/knowledge/search/route.ts:18-36`, `src/services/knowledgeEntryService.ts:39-231`, and `src/repositories/knowledgeEntryRepository.ts:158-264`.

## Doc 2: Mid-Level Architecture Guide

Pages authenticate users before rendering (`src/app/page.tsx:7-11`, `src/app/workspace/page.tsx:7-15`). Client hooks call API routes through `apiClient()` (`src/lib/http/client.ts:1-20`). Routes enforce session/role and Zod schemas (`src/app/api/knowledge/route.ts:18-28`, `src/app/api/knowledge/search/route.ts:18-36`). Services own business rules and transactions (`src/services/knowledgeEntryService.ts:83-231`). Repositories own Prisma and SQL (`src/repositories/knowledgeEntryRepository.ts:34-425`). Prisma owns persistent shape (`prisma/schema.prisma:18-119`).

## Doc 3: Senior Ownership Guide

Protect these invariants:

- Anonymous users must not reach knowledge APIs; see `src/lib/auth/apiAuth.ts:19-33`.
- Editors must not mutate other editors' drafts; see `src/lib/auth/permissions.ts:42-48` and `src/repositories/knowledgeEntryRepository.ts:85-104`.
- Only admins can curate; see `src/app/api/knowledge/[entryId]/curation/route.ts:24-36`.
- Only published entries can be curated; see `src/services/knowledgeEntryService.ts:208-210`.
- Status transitions must follow the central matrix; see `src/lib/auth/permissions.ts:78-90`.
- Mutations should write audit logs; see `src/services/knowledgeEntryService.ts:105-115`, `src/services/knowledgeEntryService.ts:148-157`, and `src/services/knowledgeEntryService.ts:181-191`.

## Doc 4: Code Review Guide

Review in this order:

1. Route boundary: does the handler require session/role like `src/app/api/knowledge/route.ts:20`?
2. Validation: does it parse with Zod like `src/app/api/knowledge/[entryId]/route.ts:31`?
3. Service rules: does the service check permissions and conflicts like `src/services/knowledgeEntryService.ts:121-160`?
4. Repository scope: does the query protect ownership like `src/repositories/knowledgeEntryRepository.ts:116-127`?
5. Cache invalidation: does the mutation invalidate affected reads like `src/hooks/useEntryMutations.ts:23-87`?
6. Tests: does the risky behavior resemble tested examples in `src/tests/services/knowledge-entry-status.test.ts:24-49` or `src/tests/repositories/workspace-scope.test.ts:23-44`?

## Doc 5: Debugging Guide

For login failures, trace `src/components/auth/login-form.tsx:67-97` -> `src/app/api/auth/login/route.ts:6-28` -> `src/services/authService.ts:18-50` -> `src/repositories/userRepository.ts:3-7` and `src/repositories/sessionRepository.ts:3-10`.

For search failures, trace `src/components/knowledge/search-dashboard.tsx:44-159` -> `src/hooks/useKnowledgeSearch.ts:14-33` -> `src/app/api/knowledge/search/route.ts:18-36` -> `src/services/knowledgeEntryService.ts:39-47` -> `src/repositories/knowledgeEntryRepository.ts:158-264`.

For workspace permission bugs, trace `src/app/workspace/page.tsx:7-15`, `src/app/api/knowledge/workspace/route.ts:18-31`, `src/services/knowledgeEntryService.ts:69-80`, and `src/repositories/knowledgeEntryRepository.ts:116-156`.

## Doc 6: Change Playbook

To add a feature:

1. Model persistent fields in `prisma/schema.prisma:18-119` if needed.
2. Add or update validation in `src/lib/validation/knowledgeEntrySchemas.ts:23-71`.
3. Add route parsing/guards in `src/app/api/knowledge`.
4. Put product rules in `src/services/knowledgeEntryService.ts:39-231`.
5. Put data operations in `src/repositories/knowledgeEntryRepository.ts:34-425`.
6. Add hook support in `src/hooks`.
7. Render UI in `src/components/knowledge`.
8. Add tests following `src/tests`.

## Doc 7: Interview Walkthrough

Say: "I worked on a Knowledge Hub app. It uses Next.js App Router for server pages and REST route handlers (`src/app/page.tsx:6-20`, `src/app/api/knowledge/search/route.ts:18-36`), React Query for client data (`src/hooks/useKnowledgeSearch.ts:30-33`), Zod for boundary validation (`src/lib/validation/knowledgeEntrySchemas.ts:23-71`), services for business rules (`src/services/knowledgeEntryService.ts:39-231`), Prisma repositories for database access (`src/repositories/knowledgeEntryRepository.ts:34-425`), and PostgreSQL full-text ranking for search (`src/repositories/knowledgeEntryRepository.ts:198-253`). The main safety decisions are session cookies, role guards, ownership checks, status-transition rules, and audit logs (`src/lib/auth/session.ts:30-74`, `src/lib/auth/apiAuth.ts:19-43`, `src/lib/auth/permissions.ts:42-90`, `src/services/knowledgeEntryService.ts:105-115`)."

