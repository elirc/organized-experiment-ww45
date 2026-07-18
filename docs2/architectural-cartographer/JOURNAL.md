# Journal

## First-Pass Mental Model

Knowledge Hub is a single Next.js App Router codebase: server pages gate access with `getServerSession()` (`src/app/page.tsx:6-20`, `src/app/workspace/page.tsx:6-24`), client dashboards fetch with React Query hooks (`src/components/knowledge/search-dashboard.tsx:14-26`, `src/hooks/useKnowledgeSearch.ts:14-33`), API routes validate and authorize (`src/app/api/knowledge/search/route.ts:18-36`, `src/app/api/knowledge/route.ts:18-28`), services apply business rules (`src/services/knowledgeEntryService.ts:39-231`), repositories isolate Prisma and SQL (`src/repositories/knowledgeEntryRepository.ts:34-425`), and Prisma defines the persistent domain (`prisma/schema.prisma:18-119`).

## Discoveries From Inspection

- The project type is Next.js 16 with React 19, TypeScript, Prisma, Zod, Tailwind, React Query, and Vitest; these dependencies are declared in `package.json:17-45`.
- The package manager is npm because `package-lock.json` exists and the scripts are npm scripts in `package.json:5-16`.
- The frontend entry point is the App Router layout at `src/app/layout.tsx:23-35`, which wraps every route in `AppProviders`.
- The backend entry points are route handlers under `src/app/api`, for example auth login at `src/app/api/auth/login/route.ts:6-28`, search at `src/app/api/knowledge/search/route.ts:18-36`, and curation at `src/app/api/knowledge/[entryId]/curation/route.ts:24-36`.
- Routing is file-system routing: `/`, `/login`, `/workspace`, and `/entries/[slug]` are implemented by `src/app/page.tsx:6-20`, `src/app/login/page.tsx:6-20`, `src/app/workspace/page.tsx:6-24`, and `src/app/entries/[slug]/page.tsx:18-65`.
- State management is local React state plus React Query cache state: search filters use `useState` in `src/components/knowledge/search-dashboard.tsx:14-26`, and server state is fetched by `useQuery` in `src/hooks/useKnowledgeSearch.ts:30-33`.
- The database/ORM layer is Prisma with PostgreSQL; the datasource is declared in `prisma/schema.prisma:13-16`, and the Prisma singleton is in `src/lib/db.ts:1-15`.
- The auth layer is session-cookie based: login sets an HTTP-only cookie in `src/app/api/auth/login/route.ts:11-24`, server session lookup reads cookies in `src/lib/auth/session.ts:30-39`, and API guards enforce session/role in `src/lib/auth/apiAuth.ts:19-43`.
- Testing uses Vitest with node environment and coverage in `vitest.config.ts:4-17`, with tests under `src/tests`.

## Why These Files Became Teaching Anchors

- `prisma/schema.prisma:18-119` is the domain contract: roles, entry statuses, entries, tags, sessions, and audit logs.
- `src/app/layout.tsx:23-35` shows how global providers enter the app.
- `src/components/providers/app-providers.tsx:7-24` creates the React Query client and devtools.
- `src/components/knowledge/search-dashboard.tsx:14-174` is the readable user-facing search flow.
- `src/components/knowledge/workspace-dashboard.tsx:73-466` is the complex editor/admin workflow.
- `src/hooks/useEntryMutations.ts:14-87` teaches cache invalidation after writes.
- `src/app/api/knowledge/search/route.ts:18-36` shows auth, query parsing, service delegation, and response shaping.
- `src/services/knowledgeEntryService.ts:83-231` contains business rules, transactions, audit logging, and permission checks.
- `src/repositories/knowledgeEntryRepository.ts:158-264` contains the most important SQL and ranking behavior.
- `src/lib/auth/permissions.ts:20-90` centralizes role, ownership, and status-transition policy.

## Where People Usually Get Stuck

Juniors often confuse server components with client components: server pages redirect using `redirect()` in `src/app/page.tsx:7-11`, while client dashboards use browser state and hooks in `src/components/knowledge/search-dashboard.tsx:14-26`.

Mid-level engineers should slow down at the service/repository boundary: service functions enforce rules before database writes (`src/services/knowledgeEntryService.ts:83-118`, `src/services/knowledgeEntryService.ts:163-194`), while repository functions express the actual Prisma/SQL operations (`src/repositories/knowledgeEntryRepository.ts:266-401`).

Senior engineers should be skeptical of trust boundaries: the UI hides admin controls in `src/components/knowledge/workspace-dashboard.tsx:275-348`, but the API also enforces `ADMIN` in `src/app/api/knowledge/[entryId]/curation/route.ts:24-36`.

## Checkpoint Practice

Use checkpoints like a review drill. A good answer names the feature, starts from a user action, crosses the HTTP boundary, names the validation schema, explains the permission rule, points at the service rule, points at the repository write/read, and ends with how React Query updates the UI.

