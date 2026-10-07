# Knowledge Hub

Knowledge Hub is an internal knowledge base for a single organization. Every page requires a login. Users can search published articles ranked by PostgreSQL full-text relevance plus admin curation. Editors write drafts and publish them, and admins can feature or boost entries and restore archived ones.

Stack, from `package.json`: Next.js 16.2.4 (App Router), React 19.2.4, Prisma 6 on PostgreSQL, Zod 3, TanStack React Query 5, bcryptjs, react-markdown with remark-gfm, Tailwind 4, and Vitest 3.

## What it does (as implemented)

- **Search.** `GET /api/knowledge/search` runs one parameterized raw SQL query (`searchPublishedEntries`, `src/repositories/knowledgeEntryRepository.ts:158-264`). It ranks with `ts_rank_cd` over title, summary, content, and tag names. It adds `+1.5` when an entry is featured and `0.15 x manualBoost`, and it can filter by tag slugs and featured-only.
- **Roles.** `VIEWER < EDITOR < ADMIN` are ordered thresholds (`src/lib/auth/permissions.ts:20-28`). Viewers search and read. Editors create entries and edit or transition their **own** entries. Admins can do everything, plus curate and restore archived entries to draft.
- **Workflow.** `DRAFT -> PUBLISHED | ARCHIVED`, `PUBLISHED -> ARCHIVED`, and `ARCHIVED -> DRAFT` (admin only) (`permissions.ts:78-91`).
- **Audit log.** One `AuditLog` row is written in the same transaction as each create, update, status change, or curation (`src/services/knowledgeEntryService.ts`).
- **Database sessions.** Each session is a random 48-hex-character token stored in the `Session` table, with a 7-day TTL by default (`src/lib/auth/session.ts:20-28`, `src/lib/env.ts:7`).

## Local setup

1. Create a `.env` with at least `DATABASE_URL`. There is **no** `.env.example` in the repo, despite earlier instructions. `src/lib/env.ts:5` requires `DATABASE_URL` and fails at import time without it. Optional variables: `APP_URL` (default `http://localhost:3000`, parsed but never read elsewhere), `SESSION_COOKIE_NAME` (default `knowledge-hub-session`), and `SESSION_TTL_DAYS` (default 7).
2. `npm install`
3. `npm run db:migrate` (`prisma migrate dev`). This applies `prisma/migrations/20260416000000_initial_schema/migration.sql`, which also creates the GIN search index that Prisma's schema language cannot express.
4. `npm run db:seed` (`tsx prisma/seed.ts`). `prisma.config.ts` registers the same seed command for `prisma db seed`.
5. `npm run dev`

`npm test` runs `vitest run --coverage`. Vitest has no `include` override (`vitest.config.ts`), so it picks up the four `src/tests/**/*.test.ts` files.

## Demo accounts (`prisma/seed.ts:7-38`)

All three use the password `password123`:

- `viewer@knowledge-hub.local` (`VIEWER`)
- `editor@knowledge-hub.local` (`EDITOR`), the author of the two published seed entries
- `admin@knowledge-hub.local` (`ADMIN`), the author of the one draft seed entry, "Incident Bridge Template"

The seed uses `upsert` for users, tags, and entries, so re-running it does not create duplicates.

## API surface

| Method and path | Guard | Service |
| --- | --- | --- |
| `POST /api/auth/login` | none | `loginWithEmail` |
| `POST /api/auth/logout` | none | `logoutByToken` |
| `GET /api/me` | session | none |
| `GET /api/tags` | **none** (unauthenticated) | `listAvailableTags` |
| `GET /api/knowledge/search` | session | `searchKnowledgeBase` |
| `GET /api/knowledge/workspace` | `EDITOR`+ | `listWorkspaceKnowledgeEntries` |
| `POST /api/knowledge` | `EDITOR`+ | `createDraftEntry` |
| `GET /api/knowledge/:entryId` | `EDITOR`+ | `getWorkspaceEntryById` |
| `PATCH /api/knowledge/:entryId` | `EDITOR`+ | `updateDraftEntry` |
| `POST /api/knowledge/:entryId/status` | `EDITOR`+ | `changeEntryStatus` |
| `POST /api/knowledge/:entryId/curation` | `ADMIN` | `curateEntry` |

Pages: `/` (search), `/workspace` (redirects viewers to `/`), `/entries/[slug]` (published only), and `/login`.

## Further docs

- `docs/architecture/` and `docs/learning/` are the code-anchored guides. They were revised against this code, with line references and review findings.
- `docs2/` and `docs3/` hold longer story-based curricula (missions, user-story build paths, and skill progressions). They were **not** re-verified in this revision, so check their file and line claims against the code before you rely on them.

Earlier versions of this README listed `tsc`, `eslint`, `vitest`, and `next build` commands "used during this build". Those were records of someone else's session, and this revision does not repeat them as results.

Start with [`docs/architecture/README.md`](docs/architecture/README.md), then [`docs/learning/guided-reading-path.md`](docs/learning/guided-reading-path.md).
