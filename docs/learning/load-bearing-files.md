# Load-Bearing Files

## src/services/knowledgeEntryService.ts
- What it does: Centralizes business rules for search, creation, update, workflow transitions, curation, and audit logging.
- What calls it: `src/app/api/knowledge/search/route.ts`, `src/app/api/knowledge/route.ts`, `src/app/api/knowledge/[entryId]/route.ts`, `src/app/api/knowledge/[entryId]/status/route.ts`, `src/app/api/knowledge/[entryId]/curation/route.ts`, and `src/app/entries/[slug]/page.tsx`.
- What it calls: `src/repositories/knowledgeEntryRepository.ts`, `src/repositories/tagRepository.ts`, `src/repositories/auditLogRepository.ts`, and `src/lib/auth/permissions.ts`.
- What would break or become insecure if this file were wrong: Editors could mutate entries they do not own, invalid status changes could slip through, and audit events could drift away from the write transaction.
- What a junior engineer would likely miswrite here: Splitting permission checks across route handlers and services so the true policy becomes impossible to audit.

## src/repositories/knowledgeEntryRepository.ts
- What it does: Owns entry reads/writes, the ownership-scoped workspace query, and the PostgreSQL ranking query.
- What calls it: `src/services/knowledgeEntryService.ts`.
- What it calls: `src/lib/db.ts`.
- What would break or become insecure if this file were wrong: Search ranking would become incorrect, or draft visibility could leak across users if the author filter disappeared.
- What a junior engineer would likely miswrite here: Putting service logic into the repository or forgetting that public search must only return `PUBLISHED` rows.

## src/lib/auth/permissions.ts
- What it does: Defines role thresholds, ownership rules, and valid workflow transitions.
- What calls it: `src/lib/auth/apiAuth.ts` and `src/services/knowledgeEntryService.ts`.
- What it calls: Nothing outside generated Prisma enums.
- What would break or become insecure if this file were wrong: RBAC and workflow integrity would drift everywhere at once because multiple services depend on it.
- What a junior engineer would likely miswrite here: Checking only role and not ownership, especially for unpublished entries.

## src/lib/auth/session.ts
- What it does: Resolves cookie sessions into server-trusted users and expires stale sessions.
- What calls it: `src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/workspace/page.tsx`, and `src/lib/auth/apiAuth.ts`.
- What it calls: `src/repositories/sessionRepository.ts` and `src/lib/env.ts`.
- What would break or become insecure if this file were wrong: Deleted or expired sessions could continue to authenticate requests.
- What a junior engineer would likely miswrite here: Trusting the cookie alone instead of verifying the database-backed session row.

## src/lib/validation/knowledgeEntrySchemas.ts
- What it does: Defines the Zod boundary for search, entry save, status change, and curation requests.
- What calls it: Knowledge entry API routes in `src/app/api/knowledge`.
- What it calls: `src/lib/utils.ts` for slug normalization.
- What would break or become insecure if this file were wrong: Invalid content shapes could cross into the service layer and produce inconsistent slugs, empty search documents, or unchecked ranking values.
- What a junior engineer would likely miswrite here: Treating validation as a UI concern and letting route handlers accept whatever JSON arrives.

## src/app/api/knowledge/[entryId]/curation/route.ts
- What it does: Exposes the admin-only curation mutation boundary.
- What calls it: `useCurateEntryMutation()` in `src/hooks/useEntryMutations.ts`, which is triggered by the admin section of `src/components/knowledge/workspace-dashboard.tsx`.
- What it calls: `requireApiRole()` in `src/lib/auth/apiAuth.ts`, `curateEntrySchema.parse()` in `src/lib/validation/knowledgeEntrySchemas.ts`, and `curateEntry()` in `src/services/knowledgeEntryService.ts`.
- What would break or become insecure if this file were wrong: Editors could gain control over featured placement and manual search boosts.
- What a junior engineer would likely miswrite here: Checking admin status in the React component and forgetting to enforce it on the server.

## src/components/knowledge/workspace-dashboard.tsx
- What it does: Drives the editorial UI for create/edit/publish/archive/curate flows.
- What calls it: `src/app/workspace/page.tsx`.
- What it calls: `src/hooks/useWorkspaceEntries.ts`, `src/hooks/useWorkspaceEntry.ts`, and `src/hooks/useEntryMutations.ts`.
- What would break or become insecure if this file were wrong: The UI could present stale state or send incomplete mutation payloads, even if the backend still rejects bad operations.
- What a junior engineer would likely miswrite here: Re-implementing permission logic in the component instead of reflecting server state.

## prisma/schema.prisma
- What it does: Defines all persistent entities, enums, and relations.
- What calls it: Prisma Client generation and every repository in `src/repositories`.
- What it calls: Nothing; it is the persistence contract.
- What would break or become insecure if this file were wrong: Search, RBAC, and audit features would not have the fields they rely on, and data relationships would become inconsistent.
- What a junior engineer would likely miswrite here: Adding flexible JSON blobs for workflow state instead of explicit enums and fields.
