# Concepts Demonstrated

For each concept: where it lives, how it works here, the risk if it is done badly, where this code falls short, and a **Check**.

## Service layer
**Where to look:** `src/services/knowledgeEntryService.ts`. `createDraftEntry` (`:83`), `updateDraftEntry` (`:121`), `changeEntryStatus` (`:163`), and `curateEntry` (`:197`) own the rules, the transactions, and the audit side effects.
**How it works:** Routes pass `session.user` and parsed input. The service decides, opens `db.$transaction`, and returns `mapWorkspaceEntry(...)`. The response never contains a raw Prisma row.
**Risk if wrong:** Policy gets duplicated across endpoints.
**Where it falls short:** Pre-transaction checks (slug uniqueness, the current status) can be stale by the time the transaction runs.
**Check:** Find the one service function that adds no logic at all. Answer: `searchKnowledgeBase` (`:39-47`).

## Repository pattern with a transaction-aware client
**Where to look:** `src/repositories/*.ts`. The write functions take `client: DbLike`.
**How it works:** The service passes its `transaction` into `upsertTagsByNames`, `createKnowledgeEntry`, and `createAuditLog`, so all three commit together.
**Where it falls short:** `createAuditLog(client: DbLike = db, input)` (`src/repositories/auditLogRepository.ts:16`) defaults the **first** parameter. Callers must always pass a client positionally, so the default can never actually be used.
**Check:** Find the reads that ignore the transaction. Answer: `findEditableEntryById` and `findEntryBySlug` use the global `db`, and the service calls them before opening the transaction.

## Zod validation boundary
**Where to look:** `src/lib/validation/knowledgeEntrySchemas.ts`.
**How it works:** Schemas normalize as well as validate. `.transform` derives the slug, and `.refine` guards its length (`:45-54`). Tags are trimmed and their whitespace collapsed (`:16-21`).
**Where it falls short:** `z.coerce.boolean()` on `featuredOnly` (`:26`). Content has no maximum length. There is no cross-check that tags are unique by *slug*.
**Check:** Find what `{ title: "!!! ???", ... }` with no slug produces. Answer: `slugify` gives `""`, and the refine fails with "Title or slug must generate at least 3 characters".

## Auth and session flow
**Where to look:** `src/lib/auth/session.ts`, `apiAuth.ts`, `src/services/authService.ts`.
**How it works:** A random token is stored in `Session`. Every request looks up the row and its user. Expired rows are deleted on access.
**Where it falls short:** The token is stored unhashed, login timing reveals which emails exist, and there is no sweep for expired sessions that are never presented again.
**Check:** Compare this design with one that stores `sha256(token)`. Which single function would change for lookup? Answer: `findSessionByToken` (`src/repositories/sessionRepository.ts:13-27`), plus `createSession` for the write.

## Role-based access control
**Where to look:** `src/lib/auth/permissions.ts`.
**How it works:** Role thresholds (`hasMinimumRole`) gate routes. Per-entry predicates (`canEditEntry`, `canTransitionEntry`) gate the service.
**Where it falls short:** Editors self-publish with no review step. Editors can also edit content that is already published.
**Check:** Find the only transition reserved for admins. Answer: `ARCHIVED -> DRAFT` (`:71-73`).

## Status and state transitions
**Where to look:** `isValidStatusTransition` (`permissions.ts:78-91`) and `changeEntryStatus`.
**How it works:** A map from each status to its allowed next statuses. The service returns 409 for an invalid transition and 403 for a forbidden one.
**Where it falls short:** Same-status moves pass the check. `publishedAt` is nulled on archive.
**Check:** Write the full transition table, including same-status moves, from `:79-87`.

## Audit logging
**Where to look:** `createAuditLog` calls at `knowledgeEntryService.ts:105`, `:148`, `:181`, `:221`.
**How it works:** Each audit row is written inside the same transaction as the change.
**Where it falls short:** Nothing reads the audit log. Update events record only the slug, not a diff (`:154-156`). Login and logout are not audited.
**Check:** Find the audit action whose metadata is the whole request input. Answer: `knowledgeEntry.curated` (`metadata: input`, `:227`).

## Search ranking (raw SQL inside a repository)
**Where to look:** `searchPublishedEntries` (`src/repositories/knowledgeEntryRepository.ts:158-264`).
**How it works:**
- weighted `tsvector` (title A, summary B, content C, tag names B);
- `websearch_to_tsquery`, which accepts user-friendly syntax such as quotes and `-`;
- `ts_rank_cd` plus a featured bonus and a boost bonus;
- a window `COUNT(*) OVER()` for pagination totals.
**Where it falls short:** The query cannot use the GIN index. Search is OR across tags.
**Check:** Find the part of the score that an admin can control. Answer: `manualBoost x 0.15` (0 to 3.75) plus 1.5 for featured, so at most 5.25 on top of `textRank`.

## Ownership-based data isolation
**Where to look:** `listWorkspaceEntries` (`:116-156`), `findEditableEntryById` (`:85-105`), `findWorkspaceEntryById` (`:56-83`).
**How it works:** Non-admins are scoped by `authorId`. The workspace detail view also allows reading any published entry.
**Check:** Explain why the regression test checks only one of these three functions. Then decide which of the other two you would test next, and why.
