# Guided Reading Path

## Step 1 — src/app/page.tsx
**Why read this:** It shows the top-level server-side entry into the authenticated search experience.
**What to look for:** `getServerSession()` and the redirect boundary that keeps unauthenticated users out before React renders the search UI.
**What to trace:** It calls `getServerSession()` in `src/lib/auth/session.ts` and renders `SearchDashboard` from `src/components/knowledge/search-dashboard.tsx`.
**What a junior would likely miss:** The page itself does not fetch search data; it only establishes the session boundary and hands off to the client shell.

## Step 2 — src/lib/auth/session.ts
**Why read this:** This file explains how a browser cookie becomes a server-trusted user.
**What to look for:** `getServerSession()`, `getSessionFromToken()`, and the expired-session cleanup path.
**What to trace:** It calls `findSessionByToken()` and `invalidateSessionByToken()` in `src/repositories/sessionRepository.ts`; pages in `src/app/page.tsx`, `src/app/login/page.tsx`, and `src/app/workspace/page.tsx` call it.
**What a junior would likely miss:** Cookie presence is not enough; the backing session row is the source of truth.

## Step 3 — src/lib/auth/apiAuth.ts
**Why read this:** This is the reusable API guard layer that keeps auth checks out of route bodies.
**What to look for:** `requireApiSession()` and `requireApiRole()`.
**What to trace:** Routes under `src/app/api/me/route.ts`, `src/app/api/knowledge/search/route.ts`, and `src/app/api/knowledge/[entryId]/curation/route.ts` call it; it calls `getSessionFromToken()` in `src/lib/auth/session.ts`.
**What a junior would likely miss:** Distinguishing `401` from `403` is not cosmetic; it changes how clients and audits interpret failures.

## Step 4 — src/lib/auth/permissions.ts
**Why read this:** It is the actual RBAC and ownership policy for the product.
**What to look for:** `canEditEntry()`, `canTransitionEntry()`, `canReadEntryInWorkspace()`, and `isValidStatusTransition()`.
**What to trace:** `src/services/knowledgeEntryService.ts` calls these helpers before mutating content; `src/lib/auth/apiAuth.ts` uses `hasMinimumRole()`.
**What a junior would likely miss:** Role checks are only half the policy; unpublished content also needs author ownership checks.

## Step 5 — src/lib/validation/knowledgeEntrySchemas.ts
**Why read this:** This file is the request contract for search, mutations, workflow transitions, and curation.
**What to look for:** The slug normalization transform and the capped `manualBoost` policy.
**What to trace:** It is consumed by routes in `src/app/api/knowledge/search/route.ts`, `src/app/api/knowledge/route.ts`, `src/app/api/knowledge/[entryId]/status/route.ts`, and `src/app/api/knowledge/[entryId]/curation/route.ts`.
**What a junior would likely miss:** Validation is not just about type shape; it also normalizes values the service layer depends on.

## Step 6 — src/app/api/knowledge/search/route.ts
**Why read this:** It is the cleanest example of the request boundary for a read-only endpoint.
**What to look for:** Query parsing, `requireApiSession()`, and the handoff into the service layer.
**What to trace:** It calls `searchEntriesQuerySchema.parse()` in `src/lib/validation/knowledgeEntrySchemas.ts` and `searchKnowledgeBase()` in `src/services/knowledgeEntryService.ts`.
**What a junior would likely miss:** The route does not know the ranking algorithm; it only validates input and delegates.

## Step 7 — src/services/knowledgeEntryService.ts
**Why read this:** This is the most important backend file because it owns business rules and transactions.
**What to look for:** `createDraftEntry()`, `changeEntryStatus()`, and `curateEntry()`.
**What to trace:** Routes in `src/app/api/knowledge/**` call it; it calls repositories in `src/repositories/knowledgeEntryRepository.ts`, `src/repositories/tagRepository.ts`, and `src/repositories/auditLogRepository.ts`.
**What a junior would likely miss:** The service layer is where permission checks, workflow rules, and transactional side effects belong together.

## Step 8 — src/repositories/knowledgeEntryRepository.ts
**Why read this:** It shows both standard CRUD queries and a realistic escape hatch into raw SQL for ranked search.
**What to look for:** `searchPublishedEntries()`, `listWorkspaceEntries()`, and the ownership-scoped `where` clause.
**What to trace:** `src/services/knowledgeEntryService.ts` calls it for all entry reads and writes; it calls Prisma through `src/lib/db.ts`.
**What a junior would likely miss:** Search ranking is intentionally implemented here, not in the service or UI, because query shape is a data-access concern.

## Step 9 — src/components/knowledge/search-dashboard.tsx
**Why read this:** It shows how the UI stays thin while still offering a polished search experience.
**What to look for:** Local filter state and the handoff into `useKnowledgeSearch()`.
**What to trace:** It calls `useKnowledgeSearch()` and `useTags()` from `src/hooks`; it is rendered by `src/app/page.tsx`.
**What a junior would likely miss:** The component controls filters, but it does not decide ranking or permissions.

## Step 10 — src/hooks/useKnowledgeSearch.ts
**Why read this:** It is the bridge between UI filter state and the REST API.
**What to look for:** Query key construction and URLSearchParams generation.
**What to trace:** It is called by `src/components/knowledge/search-dashboard.tsx` and calls `apiClient()` in `src/lib/http/client.ts`.
**What a junior would likely miss:** Cache keys must include the real filters, or search results will become stale and misleading.

## Step 11 — src/components/knowledge/workspace-dashboard.tsx
**Why read this:** It is the best example of a client surface that orchestrates many mutations without owning backend policy.
**What to look for:** `WorkspaceEditorPanel`, the selected-entry model, and mutation calls like `useChangeEntryStatusMutation()`.
**What to trace:** It calls hooks from `src/hooks/useWorkspaceEntries.ts`, `src/hooks/useWorkspaceEntry.ts`, and `src/hooks/useEntryMutations.ts`; it is rendered by `src/app/workspace/page.tsx`.
**What a junior would likely miss:** The component is busy, but all meaningful permission and transition rules still live on the server.

## Step 12 — prisma/schema.prisma
**Why read this:** It is the canonical model for roles, sessions, entries, tags, and audit logs.
**What to look for:** `EntryStatus`, `UserRole`, `KnowledgeEntry`, and `AuditLog`.
**What to trace:** Prisma Client usage in `src/repositories/*` depends on this file; `prisma/seed.ts` uses the generated enums directly.
**What a junior would likely miss:** Search and workflow features are reflected in schema fields like `manualBoost`, `isFeatured`, and `publishedAt`, not added as ad hoc JSON later.

## Step 13 — prisma/seed.ts
**Why read this:** It shows the intended runtime shape of the system through concrete demo data.
**What to look for:** Seeded roles, published vs draft entries, and tag assignment.
**What to trace:** It uses generated Prisma types from `@prisma/client` and maps directly to the login UI in `src/components/auth/login-form.tsx`.
**What a junior would likely miss:** Seed data should exercise the real states and roles your product depends on, not just create generic placeholder rows.
