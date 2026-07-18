# Auth And Permissions

## Session flow

Session creation starts in [`src/app/api/auth/login/route.ts`](../../src/app/api/auth/login/route.ts), where `POST()` parses credentials with `loginSchema`. The route calls `loginWithEmail()` in [`src/services/authService.ts`](../../src/services/authService.ts), which verifies the password with `verifyPassword()` from [`src/lib/auth/password.ts`](../../src/lib/auth/password.ts), creates a session row through `createSession()` in [`src/repositories/sessionRepository.ts`](../../src/repositories/sessionRepository.ts), and returns the token and expiry. The route then sets the HTTP-only cookie using the name from [`src/lib/env.ts`](../../src/lib/env.ts).

Session resolution happens in two places:

- Pages call `getServerSession()` in [`src/lib/auth/session.ts`](../../src/lib/auth/session.ts), which reads the cookie with `cookies()` from `next/headers`, loads the backing row with `findSessionByToken()`, and deletes expired sessions through `invalidateSessionByToken()`.
- API routes call `requireApiSession()` or `requireApiRole()` in [`src/lib/auth/apiAuth.ts`](../../src/lib/auth/apiAuth.ts), which reads the cookie from the request and resolves the same server-side session record.

## Role-based access control

The role matrix lives in [`src/lib/auth/permissions.ts`](../../src/lib/auth/permissions.ts). Important functions:

- `hasMinimumRole()` is the threshold check used by `requireApiRole()` in [`src/lib/auth/apiAuth.ts`](../../src/lib/auth/apiAuth.ts).
- `canCreateEntry()` gates workspace and draft creation in `listWorkspaceKnowledgeEntries()` and `createDraftEntry()` inside [`src/services/knowledgeEntryService.ts`](../../src/services/knowledgeEntryService.ts).
- `canEditEntry()` enforces author ownership for editors and admin override in `updateDraftEntry()`.
- `canTransitionEntry()` and `isValidStatusTransition()` enforce workflow rules in `changeEntryStatus()`.
- `canCurateEntry()` restricts featured placement and manual boosts to admins in `curateEntry()`.

Role summary:

- `VIEWER`
  Can log in, search published entries through [`src/app/api/knowledge/search/route.ts`](../../src/app/api/knowledge/search/route.ts), and read published detail pages in [`src/app/entries/[slug]/page.tsx`](../../src/app/entries/%5Bslug%5D/page.tsx).
- `EDITOR`
  Can access the workspace in [`src/app/workspace/page.tsx`](../../src/app/workspace/page.tsx), create drafts through [`src/app/api/knowledge/route.ts`](../../src/app/api/knowledge/route.ts), update their own entries through [`src/app/api/knowledge/[entryId]/route.ts`](../../src/app/api/knowledge/%5BentryId%5D/route.ts), and publish/archive via [`src/app/api/knowledge/[entryId]/status/route.ts`](../../src/app/api/knowledge/%5BentryId%5D/status/route.ts).
- `ADMIN`
  Can do everything editors can, plus curate published content through [`src/app/api/knowledge/[entryId]/curation/route.ts`](../../src/app/api/knowledge/%5BentryId%5D/curation/route.ts) and restore archived content back to draft through `changeEntryStatus()` in [`src/services/knowledgeEntryService.ts`](../../src/services/knowledgeEntryService.ts).

## Ownership and isolation

This app is not multi-tenant. The realistic isolation boundary here is author ownership over unpublished editorial work.

- Repository scoping for workspace lists lives in `listWorkspaceEntries()` inside [`src/repositories/knowledgeEntryRepository.ts`](../../src/repositories/knowledgeEntryRepository.ts), where non-admin queries include `authorId: input.actorId`.
- Single-entry workspace access is scoped in `findWorkspaceEntryById()` and `findEditableEntryById()` in the same file.
- Service-layer permission checks in [`src/services/knowledgeEntryService.ts`](../../src/services/knowledgeEntryService.ts) add a second line of defense with `canReadEntryInWorkspace()` and `canEditEntry()`.

The important pattern is “repository scoping plus permission guard,” not one or the other. If a stronger multi-tenant version were added later, `tenantId` would need to be added to `KnowledgeEntry`, `Tag`, `AuditLog`, `Session`, and every repository `where` clause. The natural insertion point is the same place author scoping already exists: `listWorkspaceEntries()`, `findWorkspaceEntryById()`, `findEditableEntryById()`, and the raw search query in `searchPublishedEntries()`.
