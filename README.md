# Knowledge Hub

Production-style internal knowledge base built with Next.js, TypeScript, Prisma, PostgreSQL, Zod, Tailwind, and React Query.

## What it does

- Authenticated knowledge search with PostgreSQL-backed ranking
- Tag filters and featured-only discovery
- Role-based access for viewers, editors, and admins
- Editorial workspace for draft, publish, archive, and restore flows
- Admin curation with featured placement and manual ranking boosts
- Audit logging around content mutations

## Stack choices

- `Next.js` App Router for pages and REST endpoints in one codebase
- `Prisma` for schema, CRUD, and transactions
- PostgreSQL full-text search via `Prisma.sql` in [`src/repositories/knowledgeEntryRepository.ts`](src/repositories/knowledgeEntryRepository.ts)
- `Zod` request validation in [`src/lib/validation`](src/lib/validation)
- `React Query` client data fetching and cache invalidation in [`src/hooks`](src/hooks)

## Local setup

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Run migrations with `npx prisma migrate dev`.
4. Seed demo data with `npx prisma db seed`.
5. Start the app with `npm run dev`.

## Demo accounts

- `viewer@knowledge-hub.local` / `password123`
- `editor@knowledge-hub.local` / `password123`
- `admin@knowledge-hub.local` / `password123`

## Verification used during this build

- `node node_modules/typescript/bin/tsc --noEmit`
- `node node_modules/eslint/bin/eslint.js .`
- `node node_modules/vitest/vitest.mjs run`
- `node node_modules/next/dist/bin/next build` with environment variables set from `.env.example`

See [`docs/architecture/README.md`](docs/architecture/README.md) and [`docs/learning/guided-reading-path.md`](docs/learning/guided-reading-path.md) for the code-anchored walkthrough.
