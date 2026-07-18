# Docs3: 25 More User Stories

This folder continues the build path from `docs2/user-story-build-path/01-stories.md` with Stories 11-35. The goal is to move you from junior implementation comfort toward senior software engineering judgment inside this specific Knowledge Hub codebase.

The progression:

- `01-stories-11-15-junior-plus.md`: small but real product improvements that teach controlled UI and API reading.
- `02-stories-16-20-mid-level.md`: features that require new state, API changes, tests, and safer contracts.
- `03-stories-21-25-mid-to-senior.md`: full-stack work with permissions, persistence, and failure modes.
- `04-stories-26-30-senior.md`: architectural improvements around auditability, performance, security, and maintainability.
- `05-stories-31-35-capstone.md`: senior/staff-style features with design tradeoffs and cross-cutting impact.

How to use these:

1. Pick the next story in order.
2. Read every listed file and line range before touching code.
3. Write down the implementation plan in your own words.
4. Implement one step at a time.
5. After each step, run the smallest meaningful verification from `package.json:5-16`.
6. Before opening a PR, answer the senior review questions.

Core code paths used throughout:

- Pages and route protection: `src/app/page.tsx:6-20`, `src/app/workspace/page.tsx:6-24`, `src/app/entries/[slug]/page.tsx:18-65`.
- Search UI and hooks: `src/components/knowledge/search-dashboard.tsx:14-174`, `src/hooks/useKnowledgeSearch.ts:14-33`.
- Workspace UI and mutations: `src/components/knowledge/workspace-dashboard.tsx:73-466`, `src/hooks/useEntryMutations.ts:14-87`.
- API boundary: `src/app/api/knowledge/search/route.ts:18-36`, `src/app/api/knowledge/route.ts:18-28`, `src/app/api/knowledge/[entryId]/route.ts:14-38`.
- Business rules: `src/services/knowledgeEntryService.ts:39-231`.
- Persistence: `prisma/schema.prisma:18-119`, `src/repositories/knowledgeEntryRepository.ts:34-425`.
- Auth and permissions: `src/lib/auth/session.ts:20-74`, `src/lib/auth/apiAuth.ts:19-43`, `src/lib/auth/permissions.ts:20-90`.
- Tests: `src/tests/validation/knowledge-entry-schema.test.ts:5-20`, `src/tests/services/knowledge-entry-status.test.ts:24-49`, `src/tests/repositories/workspace-scope.test.ts:23-44`, `src/tests/api/knowledge-curation-route.test.ts:22-42`.

