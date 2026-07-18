# Journal

## Mission Design Rationale

The missions start at the app heartbeat because the root layout and providers explain why client hooks work (`src/app/layout.tsx:23-35`, `src/components/providers/app-providers.tsx:7-24`). They move into folders, types, simple components, routes, state, hooks, side effects, API contracts, middleware-like auth guards, and then end-to-end feature tracing.

## Why This Order

Junior missions build navigation confidence with route files, UI components, and one route at a time (`src/app/page.tsx:6-20`, `src/components/ui/badge.tsx:3-23`, `src/app/api/tags/route.ts:4-10`). Mid-level missions add cache, hooks, mutation side effects, and contracts (`src/hooks/useEntryMutations.ts:14-87`, `src/lib/validation/knowledgeEntrySchemas.ts:23-71`). Senior missions force architectural judgment around ranking, auth, performance, and tests (`src/repositories/knowledgeEntryRepository.ts:158-264`, `src/lib/auth/apiAuth.ts:19-43`, `src/tests`).

## Chosen Code Paths

- Ranked search: chosen because it crosses UI, hook, route, validation, service, repository, SQL, and render (`src/components/knowledge/search-dashboard.tsx:14-174`, `src/hooks/useKnowledgeSearch.ts:14-33`, `src/app/api/knowledge/search/route.ts:18-36`, `src/repositories/knowledgeEntryRepository.ts:158-264`).
- Workspace editing: chosen because it includes create, update, status transitions, admin curation, and cache invalidation (`src/components/knowledge/workspace-dashboard.tsx:73-466`, `src/hooks/useEntryMutations.ts:14-87`, `src/services/knowledgeEntryService.ts:83-231`).
- Auth and permissions: chosen because product safety depends on cookies, roles, ownership, and status transition rules (`src/lib/auth/session.ts:20-74`, `src/lib/auth/apiAuth.ts:19-43`, `src/lib/auth/permissions.ts:20-90`).

## Skill Development By Tier

Junior: learn to find files, identify entry points, and explain small components/routes.

Mid-level: learn contracts, cache ownership, side effects, API boundaries, and feature tracing.

Senior: learn critique, threat modeling, performance reading, test design, and ownership planning.

## Senior Behavior At Checkpoints

A senior engineer answers with files and consequences. For example, "This bug leaks drafts because the non-admin workspace query must include `authorId` in `src/repositories/knowledgeEntryRepository.ts:116-127`, and a regression test already protects that behavior in `src/tests/repositories/workspace-scope.test.ts:23-44`."

