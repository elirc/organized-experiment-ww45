# Senior Engineer Guide

## Architectural Critique

- Scalability: 3/5. The app separates UI, API, service, repository, and schema (`src/components/knowledge/search-dashboard.tsx:14-174`, `src/app/api/knowledge/search/route.ts:18-36`, `src/services/knowledgeEntryService.ts:39-231`, `src/repositories/knowledgeEntryRepository.ts:34-425`, `prisma/schema.prisma:18-119`), but search has no debouncing in `src/components/knowledge/search-dashboard.tsx:44-50`.
- TypeScript discipline: 4/5. Strict mode is enabled in `tsconfig.json:2-24`, Zod infers API inputs in `src/lib/validation/knowledgeEntrySchemas.ts:67-71`, and shared response types exist in `src/types/knowledge.ts:3-44`; the weak spot is date serialization because `SearchResultEntry.updatedAt` is typed as `Date` in `src/types/knowledge.ts:11-12` while the client formats API JSON with `new Date(entry.updatedAt)` in `src/components/knowledge/search-dashboard.tsx:155`.
- Separation of concerns: 4/5. Routes validate and delegate (`src/app/api/knowledge/route.ts:18-28`), services own rules (`src/services/knowledgeEntryService.ts:83-231`), repositories own SQL (`src/repositories/knowledgeEntryRepository.ts:158-264`).
- Testability: 3/5. Vitest is configured in `vitest.config.ts:4-17`, and there are focused tests (`src/tests/services/knowledge-entry-status.test.ts:24-49`, `src/tests/repositories/workspace-scope.test.ts:23-44`), but ranked search SQL lacks direct coverage.
- Maintainability: 4/5. The boundary names are clear, and common response/errors live in `src/lib/http/responses.ts:6-47` and `src/lib/errors.ts:11-50`.
- Security posture: 3/5. HTTP-only cookies and role guards exist (`src/app/api/auth/login/route.ts:16-22`, `src/lib/auth/apiAuth.ts:19-43`), but logout manually parses cookies in `src/app/api/auth/logout/route.ts:7-12`.
- Performance: 3/5. PostgreSQL full-text ranking is powerful (`src/repositories/knowledgeEntryRepository.ts:198-229`), but the query recomputes vectors inline and the UI sends a query on every keystroke (`src/components/knowledge/search-dashboard.tsx:44-50`, `src/hooks/useKnowledgeSearch.ts:30-33`).

## Performance Audit

Finding: search requests fire as the user types because `query` changes immediately in `src/components/knowledge/search-dashboard.tsx:44-50` and the React Query key includes the full filters object in `src/hooks/useKnowledgeSearch.ts:30-33`.

Corrected pattern:

```tsx
// Add a small debounce before passing q into useKnowledgeSearch.
// This keeps the knowledge catalog from re-ranking on every keypress.
const deferredQuery = useDeferredValue(query);
const searchQuery = useKnowledgeSearch({ q: deferredQuery, tags: selectedTags, featuredOnly, page: 1, pageSize: 12 });
```

Finding: full-text vectors are built repeatedly in SQL in `src/repositories/knowledgeEntryRepository.ts:198-229`.

Corrected direction:

```sql
-- Add a generated tsvector column or materialized search document.
-- Then index it with GIN so search can use an index instead of recomputing vectors.
CREATE INDEX knowledge_entry_search_idx ON "KnowledgeEntry" USING GIN ("searchVector");
```

## Security Audit

Finding: logout parses cookies by string splitting in `src/app/api/auth/logout/route.ts:7-12`, while other API auth uses `request.cookies` in `src/lib/auth/apiAuth.ts:19-20`.

Corrected code:

```ts
export async function POST(request: NextRequest) {
  try {
    // Use NextRequest cookies instead of hand-parsing the Cookie header.
    const token = request.cookies.get(env.SESSION_COOKIE_NAME)?.value;
    if (token) await logoutByToken(token);
    const response = apiOk({ success: true });
    response.cookies.set(env.SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(0) });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
```

Finding: curation is correctly guarded on both UI and API. UI admin-only rendering is in `src/components/knowledge/workspace-dashboard.tsx:275-348`, and the API requires `ADMIN` in `src/app/api/knowledge/[entryId]/curation/route.ts:24-36`.

## TypeScript Discipline Review

Keep: Zod-inferred inputs in `src/lib/validation/knowledgeEntrySchemas.ts:67-71`; Prisma enums in `src/lib/auth/permissions.ts:11-27`; explicit response DTOs in `src/types/knowledge.ts:3-44`.

Improve: use API-safe serialized date types for client DTOs. The client receives JSON, so `updatedAt` and `publishedAt` in `src/types/knowledge.ts:11-12` and `src/types/knowledge.ts:31-32` should be `string | null` in client-facing response types, or conversion should happen in `apiClient()` in `src/lib/http/client.ts:1-20`.

## Custom Abstractions Inventory

- `apiClient()` centralizes JSON fetch and error throwing (`src/lib/http/client.ts:1-20`).
- `apiOk()` and `apiError()` centralize API response shape (`src/lib/http/responses.ts:6-47`).
- `AppError` subclasses map domain failures to HTTP status (`src/lib/errors.ts:11-50`).
- `requireApiSession()` and `requireApiRole()` centralize API auth guards (`src/lib/auth/apiAuth.ts:19-43`).
- `canEditEntry()`, `canReadEntryInWorkspace()`, and `isValidStatusTransition()` centralize permission/workflow policy (`src/lib/auth/permissions.ts:42-90`).
- `mapWorkspaceEntry()` maps Prisma includes into API DTOs (`src/repositories/knowledgeEntryRepository.ts:404-425`).
- React Query hooks hide endpoint details (`src/hooks/useKnowledgeSearch.ts:14-33`, `src/hooks/useEntryMutations.ts:14-87`).

## Testing Assessment

Existing tests cover malformed save payloads (`src/tests/validation/knowledge-entry-schema.test.ts:5-20`), invalid status transitions (`src/tests/services/knowledge-entry-status.test.ts:24-49`), workspace ownership scoping (`src/tests/repositories/workspace-scope.test.ts:23-44`), and admin curation authorization (`src/tests/api/knowledge-curation-route.test.ts:22-42`).

Runnable test to add for risky untested behavior:

```ts
// src/tests/services/knowledge-entry-curation.test.ts
import { EntryStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

const findEditableEntryById = vi.fn();
vi.mock("@/repositories/knowledgeEntryRepository", async () => ({
  ...(await vi.importActual("@/repositories/knowledgeEntryRepository")),
  findEditableEntryById,
}));

describe("curateEntry", () => {
  it("rejects curation for drafts", async () => {
    // Curation affects public ranking, so drafts must not receive public ranking controls.
    findEditableEntryById.mockResolvedValue({ id: "entry-1", authorId: "admin-1", status: EntryStatus.DRAFT });
    const { curateEntry } = await import("@/services/knowledgeEntryService");
    await expect(curateEntry({ id: "admin-1", email: "a@example.com", name: "Admin", role: "ADMIN" }, "entry-1", { isFeatured: true, manualBoost: 1, curationNotes: null })).rejects.toThrow("Only published entries can be curated");
  });
});
```

This targets the rule in `src/services/knowledgeEntryService.ts:197-231`.

## Bug Injection Exercise

1. Symptom: an editor sees another editor's draft in the workspace. Test scenario: assert non-admin workspace queries include `authorId`, like `src/tests/repositories/workspace-scope.test.ts:23-44`.
2. Symptom: an admin can boost a draft, but search results do not change. Test scenario: call `curateEntry()` for `EntryStatus.DRAFT` and expect a conflict, based on `src/services/knowledgeEntryService.ts:208-210`.
3. Symptom: search results reorder unpredictably after manual boosts. Test scenario: inspect the score expression in `src/repositories/knowledgeEntryRepository.ts:244-253`.
4. Symptom: published entries can go directly back to draft. Test scenario: mirror `src/tests/services/knowledge-entry-status.test.ts:24-49`.
5. Symptom: login tells attackers whether an email exists. Test scenario: verify missing user and bad password both throw the same message in `src/services/authService.ts:18-30`.

## Git History Learning Exercise

No `.git` directory is present in this workspace, so actual commit history could not be inspected. Use these realistic commit messages as practice against the current files:

1. `Add session-backed login and logout routes`: implies changes across `src/app/api/auth/login/route.ts:6-28`, `src/app/api/auth/logout/route.ts:5-31`, `src/services/authService.ts:18-50`, and `src/lib/auth/session.ts:20-74`.
2. `Introduce workspace entry ownership scoping`: implies `src/repositories/knowledgeEntryRepository.ts:56-156`, `src/lib/auth/permissions.ts:42-60`, and `src/tests/repositories/workspace-scope.test.ts:23-44`.
3. `Replace client-side search sorting with PostgreSQL ranking`: implies `src/hooks/useKnowledgeSearch.ts:14-33`, `src/app/api/knowledge/search/route.ts:18-36`, and `src/repositories/knowledgeEntryRepository.ts:158-264`.
4. `Add admin curation controls`: implies UI in `src/components/knowledge/workspace-dashboard.tsx:275-348`, route in `src/app/api/knowledge/[entryId]/curation/route.ts:24-36`, and service rule in `src/services/knowledgeEntryService.ts:197-231`.
5. `Add audit logs to entry mutations`: implies transaction changes in `src/services/knowledgeEntryService.ts:94-118`, `src/services/knowledgeEntryService.ts:138-160`, and `src/services/knowledgeEntryService.ts:178-194`.

## If I Owned This Codebase

- Add debounced search input: effort S, impact M; touches `src/components/knowledge/search-dashboard.tsx:44-50` and `src/hooks/useKnowledgeSearch.ts:30-33`.
- Serialize API dates explicitly: effort M, impact M; touches `src/types/knowledge.ts:3-44`, `src/repositories/knowledgeEntryRepository.ts:404-425`, and `src/lib/http/client.ts:1-20`.
- Add ranked-search repository tests with a test database: effort L, impact H; targets `src/repositories/knowledgeEntryRepository.ts:158-264`.
- Convert logout to `NextRequest` cookie access: effort S, impact M; touches `src/app/api/auth/logout/route.ts:5-31`.
- Add pagination controls to search UI: effort M, impact M; current API supports `page` and `pageSize` in `src/lib/validation/knowledgeEntrySchemas.ts:23-29`, but UI hardcodes page 1 in `src/components/knowledge/search-dashboard.tsx:20-26`.
- Add centralized query key constants: effort S, impact M; current keys are string arrays in `src/hooks/useKnowledgeSearch.ts:31` and `src/hooks/useEntryMutations.ts:25-83`.

