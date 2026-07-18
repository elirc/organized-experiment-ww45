# Concepts Demonstrated

## Service layer
Where to look: `src/services/knowledgeEntryService.ts` — `createDraftEntry()`, `changeEntryStatus()`, and `curateEntry()` own business rules, transactions, and side effects.
Also see: `src/services/authService.ts` for the same pattern applied to login and logout.
Risk if wrong: Routes become thin wrappers around database calls, and permission or workflow bugs get duplicated across endpoints.

## Repository pattern
Where to look: `src/repositories/knowledgeEntryRepository.ts` — `searchPublishedEntries()` and `listWorkspaceEntries()` isolate all query logic.
Also see: `src/repositories/sessionRepository.ts` for the session lookup equivalent.
Risk if wrong: Query policy leaks into services and components, which makes search ranking and ownership rules harder to audit.

## Zod validation boundary
Where to look: `src/lib/validation/knowledgeEntrySchemas.ts` — `saveKnowledgeEntrySchema` normalizes slugs and bounds tags, while `curateEntrySchema` caps ranking boost.
Also see: `src/app/api/knowledge/route.ts` for the route-level `.parse()` call before the service runs.
Risk if wrong: Bad input reaches the service layer and creates inconsistent slugs, malformed drafts, or uncontrolled ranking overrides.

## Auth/session flow
Where to look: `src/lib/auth/session.ts` — `getSessionFromToken()` turns a cookie token into a server-trusted `AuthSession`.
Also see: `src/services/authService.ts` for `loginWithEmail()` and `src/app/api/auth/login/route.ts` for cookie issuance.
Risk if wrong: Expired or deleted sessions continue to authenticate users, or login flows start exposing security-sensitive behavior.

## Role-based access control
Where to look: `src/lib/auth/permissions.ts` — `hasMinimumRole()`, `canEditEntry()`, and `canCurateEntry()` express the product rules.
Also see: `src/lib/auth/apiAuth.ts` for the reusable `requireApiRole()` guard used by routes.
Risk if wrong: Editors may gain admin controls, or viewers may gain access to the editorial workspace.

## Status and state transitions
Where to look: `src/lib/auth/permissions.ts` — `isValidStatusTransition()` defines allowed workflow moves.
Also see: `src/services/knowledgeEntryService.ts` — `changeEntryStatus()` applies that matrix to a real entry and actor.
Risk if wrong: Content can jump into impossible states, which breaks reporting, search expectations, and curation assumptions.

## Audit logging
Where to look: `src/repositories/auditLogRepository.ts` — `createAuditLog()` writes audit rows.
Also see: `src/services/knowledgeEntryService.ts` where each write transaction records `knowledgeEntry.created`, `knowledgeEntry.updated`, `knowledgeEntry.statusChanged`, or `knowledgeEntry.curated`.
Risk if wrong: Sensitive editorial changes become hard to review, debug, or attribute after the fact.

## Search ranking
Where to look: `src/repositories/knowledgeEntryRepository.ts` — `searchPublishedEntries()` combines PostgreSQL full-text rank with `isFeatured` and `manualBoost`.
Also see: `prisma/migrations/20260416000000_initial_schema/migration.sql` for the GIN index on the search document expression.
Risk if wrong: Search quality degrades, featured content cannot reliably surface, or expensive unindexed queries hit production traffic.

## Ownership-based data isolation
Where to look: `src/repositories/knowledgeEntryRepository.ts` — `listWorkspaceEntries()` and `findEditableEntryById()` scope non-admin access by `authorId`.
Also see: `src/tests/repositories/workspace-scope.test.ts` for the regression test that verifies the filter is present.
Risk if wrong: One editor can see or mutate another editor’s drafts.
