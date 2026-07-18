# Skill Progression Map

## Junior To Junior-Plus

You are learning to make safe, scoped changes without breaking data flow. Stories 11-15 emphasize reading existing component state, preserving API contracts, and changing display behavior without moving business rules.

Skills trained:

- Controlled inputs in `src/components/knowledge/search-dashboard.tsx:44-50`.
- Result card rendering in `src/components/knowledge/search-dashboard.tsx:137-159`.
- Header props and role display in `src/components/layout/app-header.tsx:8-36`.
- Workspace form state in `src/components/knowledge/workspace-dashboard.tsx:23-127`.

## Mid-Level

You are learning to add new server contracts and tests without leaking complexity into the UI. Stories 16-20 emphasize Zod schemas, API routes, React Query hooks, and endpoint tests.

Skills trained:

- Request validation in `src/lib/validation/knowledgeEntrySchemas.ts:23-71`.
- API route patterns in `src/app/api/knowledge/route.ts:18-28`.
- Query/mutation hooks in `src/hooks/useKnowledgeSearch.ts:14-33` and `src/hooks/useEntryMutations.ts:14-87`.
- Standard responses in `src/lib/http/responses.ts:6-47`.

## Mid-Level To Senior

You are learning to change the domain model and reason about permissions, audit logging, and data integrity. Stories 21-25 emphasize Prisma, repositories, services, and regression tests.

Skills trained:

- Domain modeling in `prisma/schema.prisma:18-119`.
- Transactions in `src/services/knowledgeEntryService.ts:94-118`, `src/services/knowledgeEntryService.ts:138-160`, and `src/services/knowledgeEntryService.ts:178-194`.
- Repository scoping in `src/repositories/knowledgeEntryRepository.ts:56-156`.
- Permission rules in `src/lib/auth/permissions.ts:42-90`.

## Senior

You are learning to reduce risk across the system, not just ship features. Stories 26-30 emphasize performance, security, auditability, and maintainability.

Skills trained:

- Search ranking SQL in `src/repositories/knowledgeEntryRepository.ts:158-264`.
- Session handling in `src/lib/auth/session.ts:20-74`.
- API error mapping in `src/lib/http/responses.ts:10-47`.
- Tests that protect product invariants in `src/tests`.

## Capstone

You are learning to design cross-cutting features and explain tradeoffs. Stories 31-35 require new domain concepts, API surfaces, UI workflows, and senior review plans.

Senior bar:

- You can explain what layer owns each concern.
- You can name likely regression classes before coding.
- You can write a test plan before implementing.
- You can defend tradeoffs using actual files and line ranges.

