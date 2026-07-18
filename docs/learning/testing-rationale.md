# Testing Rationale

## `src/tests/api/knowledge-curation-route.test.ts` — `returns 403 when a non-admin hits the curation endpoint`

This is worth a test because curation changes public search order. If the role guard in `src/app/api/knowledge/[entryId]/curation/route.ts` or `src/lib/auth/apiAuth.ts` regresses, an editor could start featuring and boosting entries without any obvious UI change. A fuller production suite would add an integration test that logs in as each role and exercises the real cookie/session flow, not just the route boundary.

## `src/tests/validation/knowledge-entry-schema.test.ts` — `rejects a malformed knowledge entry payload`

This guards the Zod boundary in `src/lib/validation/knowledgeEntrySchemas.ts`. It matters because bad drafts create expensive cleanup work later: duplicate or unusable slugs, empty search documents, and inconsistent tag state. A fuller suite would add table-driven validation cases for edge lengths, slug derivation, and tag normalization behavior.

## `src/tests/services/knowledge-entry-status.test.ts` — `rejects an invalid published-to-draft transition`

This catches a workflow integrity bug in `src/services/knowledgeEntryService.ts` and `src/lib/auth/permissions.ts`. Status transitions are easy to loosen accidentally during refactors, and the failure is subtle because the wrong state often looks fine in the UI until downstream logic assumes otherwise. A fuller suite would cover every allowed and rejected transition for both editors and admins, plus assertions around the paired audit-log write.

## `src/tests/repositories/workspace-scope.test.ts` — `scopes non-admin workspace queries to the actor's own entries`

This test protects the ownership filter in `src/repositories/knowledgeEntryRepository.ts`. It matters because draft leakage is often caused by a tiny repository refactor that drops a single `authorId` condition. A fuller suite would run against a real test database with multiple editors and confirm both list and single-entry queries stay isolated under real Prisma execution.
