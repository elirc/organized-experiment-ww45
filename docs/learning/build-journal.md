# Build Journal

This journal records the build stages, the decisions behind them, and the PR slices. The "Review notes" were added later. They compare each decision with the code as it stands, based only on reading this repository.

## Stage 1: Project framing
- **Built:** A single-organization internal knowledge base, not multi-tenant SaaS.
- **Decision:** Isolation is author ownership, implemented in `listWorkspaceEntries` and `findEditableEntryById` (`src/repositories/knowledgeEntryRepository.ts:85-156`).
- **Why:** The requirements asked for strong auth and permissions, but not tenants.
- **Review notes:** The ownership model holds for every mutation path. A future `tenantId` would also have to touch the raw search SQL, the globally unique tag slugs and names, and the unauthenticated `GET /api/tags`.

## Stage 2: Data layer and search strategy
- **Options:**
  - Prisma only with `contains`: easy, but weak ranking.
  - Drizzle: powerful, but a steeper learning curve.
  - Prisma for CRUD plus parameterized raw SQL for search.
- **Chosen:** Prisma plus raw SQL (`searchPublishedEntries`).
- **Why it won:** The schema stays approachable while search uses `ts_rank_cd`, `websearch_to_tsquery`, and a GIN index.
- **Junior / mid / senior lens:**
  - A junior engineer keeps everything in the ORM.
  - A mid-level engineer knows when an escape hatch is justified.
  - A senior engineer keeps that escape hatch narrow, parameterized, and in the repository.
- **Review notes:** The escape hatch is narrow and fully parameterized. The index is the weak point. It covers title, summary, and content, while the query ranks a different expression that includes aggregated tag names in `HAVING`, so the index cannot serve it. Also, `npm run db:push` exists as a script but would not create the hand-written index.

## Stage 3: Auth and RBAC
- **Options:**
  - An external auth package.
  - Stateless JWT.
  - Custom database sessions with explicit RBAC.
- **Chosen:** Database sessions (`authService.ts`, `session.ts`, `apiAuth.ts`).
- **Why it won:** Explicit end to end, and deleting a row revokes the session immediately.
- **Review notes:**
  - Revocation and 401/403 semantics are correct.
  - Tokens are stored unhashed.
  - Login timing reveals which emails exist.
  - `canAccessWorkspace` was written but the workspace page checks the role inline instead.

## Stage 4: Service and repository boundaries
- **Built:** `knowledgeEntryService.ts` and `knowledgeEntryRepository.ts` as separate layers.
- **Review notes:** Routes really are thin, at 11-39 lines. Every write passes the transaction client through. Uniqueness pre-checks sit outside the transaction, so a duplicate-slug race surfaces as a 500 instead of a 409.

## Stage 5: Editorial workflow and curation
- **Built:** Three statuses, the transition matrix, and admin curation limited to published entries.
- **Review notes:**
  - `updateDraftEntry` is not limited to drafts.
  - Same-status transitions are allowed, and they rewrite `publishedAt`.
  - Archiving keeps curation boosts.
  - The UI offers Publish on archived entries.

## Stage 6: UI and client data flow
- **Built:** React Query hooks, the search dashboard, and the workspace dashboard.
- **Review notes:** The hooks invalidate the correct keys (`useEntryMutations.ts`). The UI hides curation from non-admins, and the server enforces it as well.

## Stage 7: Tests and docs
- **Built:** Four tests, `docs/architecture`, and `docs/learning`. `docs2/` and `docs3/` hold longer curricula. This revision did not re-verify those two.
- **Review notes:** Every test exercises a real boundary, but each one has a blind spot. See `docs/learning/testing-rationale.md`.

---

## PR Slices

### Slice 1: Persistence model, seed data, and search indexing
- **Files:** `prisma/schema.prisma`, `prisma/migrations/20260416000000_initial_schema/migration.sql`, `prisma/seed.ts`.
- **Reviewer focus:**
  - `UserRole` and `EntryStatus`, and the curation fields on `KnowledgeEntry` (`schema.prisma:58-82`).
  - `KnowledgeEntry_search_idx` (`migration.sql:112-120`).
- **Strong reviewer catch:** Ask whether the index expression matches the search query, and whether `Tag.name` should really be globally unique when upserts overwrite it.

### Slice 2: Auth, sessions, and permission guards
- **Files:** `session.ts`, `apiAuth.ts`, `permissions.ts`, `authService.ts`, `login/route.ts`.
- **Reviewer focus:** Expired sessions are deleted on access (`session.ts:48-52`). The 401/403 split holds (`apiAuth.ts:35-44`). The editor ownership rules (`permissions.ts:42-60`).
- **Strong reviewer catch:** Hash the token at rest. Make every login attempt cost the same time.

### Slice 3: Entry services, repositories, and workflow
- **Files:** the service, three repositories, and the search, status, and curation routes.
- **Reviewer focus:** Transaction boundaries, author scoping, and that search returns only published entries.
- **Strong reviewer catch:**
  - `updateDraftEntry` edits published entries.
  - Tag upserts rename shared tags.
  - Same-status transitions.

### Slice 4: Search and editorial UI
- **Files:** both dashboards, `useKnowledgeSearch.ts`, `useEntryMutations.ts`, and the entry page.
- **Reviewer focus:** The filter state matches the query string. The UI reflects capabilities without re-implementing them.
- **Strong reviewer catch:** The Publish button on archived entries. The unauthenticated tags list feeding the search filter.

### Slice 5: Tests and teaching docs
- **Files:** `src/tests/**`, `docs/**`.
- **Reviewer focus:** Each assertion checks behavior, not just that a call happened.
- **Strong reviewer catch:** The curation test does not assert which role is required.

---

## Senior review summary (ranked)

1. **Editors can rewrite published content without review.** `updateDraftEntry` has no status check (`src/services/knowledgeEntryService.ts:121-161`), and the UI calls it for any selected entry (`workspace-dashboard.tsx:115-118`).
2. **`featuredOnly=false` returns featured-only results** (`src/lib/validation/knowledgeEntrySchemas.ts:26`).
3. **The search query cannot use its GIN index** (`knowledgeEntryRepository.ts:220-229` vs `migration.sql:112-120`).
4. **Tag upserts rename shared tags globally** (`src/repositories/tagRepository.ts:22-26`), and `/api/tags` is public (`src/app/api/tags/route.ts`).
5. **Session tokens are stored in plaintext** (`src/repositories/sessionRepository.ts:3-11`).
6. **Slug check-then-insert race** gives a 500 (`knowledgeEntryService.ts:88-92`).
