# Auth And Permissions

There are three layers: a session row looked up by cookie token, a role threshold enforced by route guards, and per-entry ownership rules enforced in both repositories and services.

## 1. Session creation

1. `POST /api/auth/login` (`src/app/api/auth/login/route.ts:6-28`) parses the body with `loginSchema`: a valid email and a password of 8-128 characters (`src/lib/validation/authSchemas.ts:13-17`).
2. `loginWithEmail` (`src/services/authService.ts:18-47`):
   - `findUserByEmail` lowercases the email (`src/repositories/userRepository.ts:3-7`);
   - `verifyPassword` uses bcrypt (`src/lib/auth/password.ts:7-9`);
   - both failures return the same message, "Invalid email or password" (`:21-30`);
   - it creates a token with `createSessionToken()`, 24 random bytes as hex (`src/lib/auth/session.ts:20-22`), and an expiry of now plus `SESSION_TTL_DAYS` (`:24-28`);
   - it inserts the session row (`src/repositories/sessionRepository.ts:3-11`).
3. The route sets an `httpOnly`, `sameSite: "lax"` cookie, `secure` only in production, `path: "/"`, that expires with the session (`login/route.ts:16-22`).

The token is stored **as-is** in `Session.token` (`@unique`, `prisma/schema.prisma:48`). Anyone who can read the `Session` table can paste a token into a cookie and impersonate that user until it expires. Hashing the token before storage (and hashing the cookie value at lookup) would close this.

The equal-message check hides which emails exist through the response body, but timing does not: an unknown email returns at `authService.ts:21-23` without running bcrypt, while a known email pays for a 10-round compare.

## 2. Session resolution

There are two entry points, and both end in `getSessionFromToken` (`session.ts:41-64`):

- **Pages** call `getServerSession()` (`:30-39`), which reads the cookie with `cookies()` from `next/headers`.
- **API routes** call `requireApiSession(request)` (`src/lib/auth/apiAuth.ts:19-33`), which reads `request.cookies` and throws `AuthenticationError` (401) if the token is missing or unknown.

`getSessionFromToken` loads the row together with a narrow `user` select (`id, email, name, role`; `sessionRepository.ts:13-27`). If the row has expired, it **deletes** it (`session.ts:48-52`) and returns null. Role changes take effect on the next request, because the role is read from the row's user every time.

`requireApiRole(request, minimumRole)` (`apiAuth.ts:35-44`) calls `requireApiSession` and then `hasMinimumRole`, which throws `AuthorizationError` (403). The 401/403 split is preserved.

**Logout** (`src/app/api/auth/logout/route.ts:5-31`) parses the raw `cookie` header by hand (`:7-12`), deletes the session row, and clears the cookie. The hand parser takes `split("=")[1]`. That is safe for hex tokens, but it is a second cookie parser alongside `request.cookies`.

## 3. Roles

`roleOrder` (`src/lib/auth/permissions.ts:20-24`) maps `VIEWER` to 1, `EDITOR` to 2, and `ADMIN` to 3. `hasMinimumRole` compares the numbers (`:26-28`).

| Capability | Where enforced | VIEWER | EDITOR | ADMIN |
| --- | --- | --- | --- | --- |
| Search and read published entries | `requireApiSession` (search route `:21`); entry page `getServerSession` | yes | yes | yes |
| Workspace page | `src/app/workspace/page.tsx:13-15` redirects viewers | - | yes | yes |
| Workspace API (list, get) | `requireApiRole("EDITOR")`, plus `canCreateEntry` in the list service | - | own entries + any published | all |
| Create entry | `requireApiRole("EDITOR")` + `canCreateEntry` (`:34-36`) | - | yes | yes |
| Edit entry content | `findEditableEntryById` scope + `canEditEntry` (`:42-48`) | - | own entries, **any status** | all |
| Status transitions | `canTransitionEntry` (`:62-76`) | - | own entries | all |
| Archived to draft | `canTransitionEntry` `:71-73` | - | - | yes |
| Curate (feature/boost) | route `requireApiRole("ADMIN")` + `canCurateEntry` (`:38-40`) | - | - | yes, published only |

Notes:
- `canAccessWorkspace` (`:30-32`) is defined but never called. The workspace page checks `role === "VIEWER"` directly.
- Editors publish their own drafts directly. There is no review or approval step.

## 4. Ownership and isolation

This app is not multi-tenant. Isolation is **author ownership of unpublished work**:

- `listWorkspaceEntries` adds `authorId: input.actorId` for non-admins (`src/repositories/knowledgeEntryRepository.ts:117-127`).
- `findEditableEntryById` uses `{ id, authorId }` for non-admins (`:85-105`). Every mutation path in the service goes through it, so an editor gets 404, not 403, for another editor's entry.
- `findWorkspaceEntryById` uses `{ id, OR: [{ status: PUBLISHED }, { authorId }] }` for non-admins (`:56-83`). An editor can open any published entry in the workspace detail view, read-only.
- The service re-checks with `canReadEntryInWorkspace` (`src/services/knowledgeEntryService.ts:62`) and `canEditEntry` (`:128`). Those checks are redundant with the repository scope today, which is the intended "belt and braces" design.

Public search is restricted to published entries in the SQL itself (`entry."status" = 'PUBLISHED'`, `knowledgeEntryRepository.ts:216`), and the entry page uses `findPublishedEntryBySlug` (`:34-54`).

**Tenancy later:** adding `tenantId` would touch `KnowledgeEntry`, `Tag` (slugs and names are globally unique today, `prisma/schema.prisma:87`, `:91`), `AuditLog`, `Session`/`User`, all three `find*` scopes, the raw SQL `WHERE` and the tag sub-select, and `GET /api/tags`.

## Senior review findings

1. **Editors can silently rewrite published content.** `updateDraftEntry` has no status check (`knowledgeEntryService.ts:121-161`), and the UI's editor form saves through it for any selected entry.
2. **Session tokens are stored in plaintext** (`sessionRepository.ts:3-11`, `schema.prisma:48`).
3. **`GET /api/tags` is unauthenticated** (`src/app/api/tags/route.ts:4-11`). Tag names created on drafts leak to anonymous users.
4. **Shared tags can be renamed by any editor.** `upsertTagsByNames` updates `name` on slug conflict (`src/repositories/tagRepository.ts:22-26`), so saving an entry with the tag "SECURITY" renames the global "Security" tag for everyone.
5. **Login timing reveals which emails exist**, and there is no rate limiting.

## Exercises

1. **Goal:** Show that an editor gets 404, not 403, for someone else's draft.
   **Check:** `changeEntryStatus` begins with `findEditableEntryById(actor.id, actor.role, entryId)` (`knowledgeEntryService.ts:164`). The `authorId` filter returns null, and `:166-168` throws `NotFoundError`.
2. **Goal:** Find where an expired session is cleaned up and where it is not.
   **Check:** It is cleaned up on access (`session.ts:48-52`). Sessions that are never presented again stay in the table. `Session_expiresAt_idx` (`migration.sql:75`) would support a sweep job, but none exists.
3. **Goal:** Confirm that curation is double-guarded.
   **Check:** The route calls `requireApiRole(request, "ADMIN")` (`src/app/api/knowledge/[entryId]/curation/route.ts:27`), and the service calls `canCurateEntry` (`knowledgeEntryService.ts:198-200`).
