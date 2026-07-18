/**
 * What this file does:
 * Applies business rules for searching, editing, publishing, archiving, and curating knowledge entries before any repository call runs.
 * What calls it:
 * Route handlers under src/app/api/knowledge plus server pages like src/app/entries/[slug]/page.tsx.
 * What it calls:
 * src/repositories/knowledgeEntryRepository.ts, src/repositories/tagRepository.ts, src/repositories/auditLogRepository.ts, and src/lib/auth/permissions.ts.
 * One thing a junior engineer would likely get wrong when writing something similar:
 * Letting the route decide half the rules and the service decide the other half, which makes permission bugs nearly impossible to reason about.
 */
import { EntryStatus } from "@prisma/client";

import { canCreateEntry, canCurateEntry, canEditEntry, canTransitionEntry, canReadEntryInWorkspace, isValidStatusTransition } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/types";
import { db } from "@/lib/db";
import { AuthorizationError, ConflictError, NotFoundError } from "@/lib/errors";
import {
  createKnowledgeEntry,
  findEditableEntryById,
  findEntryBySlug,
  findPublishedEntryBySlug,
  findWorkspaceEntryById,
  listWorkspaceEntries,
  mapWorkspaceEntry,
  searchPublishedEntries,
  updateKnowledgeEntry,
  updateKnowledgeEntryCuration,
  updateKnowledgeEntryStatus,
} from "@/repositories/knowledgeEntryRepository";
import { createAuditLog } from "@/repositories/auditLogRepository";
import { upsertTagsByNames } from "@/repositories/tagRepository";
import type {
  CurateEntryInput,
  SaveKnowledgeEntryInput,
  SearchEntriesQuery,
  WorkspaceEntriesQuery,
} from "@/lib/validation/knowledgeEntrySchemas";

export async function searchKnowledgeBase(input: SearchEntriesQuery) {
  return searchPublishedEntries({
    query: input.q,
    tagSlugs: input.tags,
    featuredOnly: input.featuredOnly,
    page: input.page,
    pageSize: input.pageSize,
  });
}

export async function getPublishedEntryBySlug(slug: string) {
  const entry = await findPublishedEntryBySlug(slug);

  if (!entry) {
    throw new NotFoundError("Knowledge entry not found");
  }

  return mapWorkspaceEntry(entry);
}

export async function getWorkspaceEntryById(actor: SessionUser, entryId: string) {
  const entry = await findWorkspaceEntryById(actor.id, actor.role, entryId);

  if (!entry || !canReadEntryInWorkspace(actor, entry)) {
    throw new NotFoundError("Knowledge entry not found");
  }

  return mapWorkspaceEntry(entry);
}

export async function listWorkspaceKnowledgeEntries(actor: SessionUser, input: WorkspaceEntriesQuery) {
  if (!canCreateEntry(actor)) {
    throw new AuthorizationError();
  }

  return listWorkspaceEntries({
    actorId: actor.id,
    actorRole: actor.role,
    statuses: input.status,
    page: input.page,
    pageSize: input.pageSize,
  });
}

export async function createDraftEntry(actor: SessionUser, input: SaveKnowledgeEntryInput) {
  if (!canCreateEntry(actor)) {
    throw new AuthorizationError();
  }

  const existingEntry = await findEntryBySlug(input.slug);

  if (existingEntry) {
    throw new ConflictError("That slug is already in use");
  }

  return db.$transaction(async (transaction) => {
    const tags = await upsertTagsByNames(transaction, input.tags);
    const entry = await createKnowledgeEntry(transaction, {
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      content: input.content,
      authorId: actor.id,
      tagIds: tags.map((tag) => tag.id),
    });

    await createAuditLog(transaction, {
      action: "knowledgeEntry.created",
      targetType: "knowledgeEntry",
      targetId: entry.id,
      entryId: entry.id,
      actorId: actor.id,
      metadata: {
        slug: entry.slug,
        status: entry.status,
      },
    });

    return mapWorkspaceEntry(entry);
  });
}

export async function updateDraftEntry(actor: SessionUser, entryId: string, input: SaveKnowledgeEntryInput) {
  const currentEntry = await findEditableEntryById(actor.id, actor.role, entryId);

  if (!currentEntry) {
    throw new NotFoundError("Knowledge entry not found");
  }

  if (!canEditEntry(actor, currentEntry)) {
    throw new AuthorizationError();
  }

  const existingEntry = await findEntryBySlug(input.slug, entryId);

  if (existingEntry) {
    throw new ConflictError("That slug is already in use");
  }

  return db.$transaction(async (transaction) => {
    const tags = await upsertTagsByNames(transaction, input.tags);
    const updatedEntry = await updateKnowledgeEntry(transaction, entryId, {
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      content: input.content,
      tagIds: tags.map((tag) => tag.id),
    });

    await createAuditLog(transaction, {
      action: "knowledgeEntry.updated",
      targetType: "knowledgeEntry",
      targetId: updatedEntry.id,
      entryId: updatedEntry.id,
      actorId: actor.id,
      metadata: {
        slug: updatedEntry.slug,
      },
    });

    return mapWorkspaceEntry(updatedEntry);
  });
}

export async function changeEntryStatus(actor: SessionUser, entryId: string, nextStatus: EntryStatus) {
  const currentEntry = await findEditableEntryById(actor.id, actor.role, entryId);

  if (!currentEntry) {
    throw new NotFoundError("Knowledge entry not found");
  }

  if (!isValidStatusTransition(currentEntry.status, nextStatus)) {
    throw new ConflictError(`Cannot move an entry from ${currentEntry.status} to ${nextStatus}`);
  }

  if (!canTransitionEntry(actor, currentEntry, nextStatus)) {
    throw new AuthorizationError("You cannot apply this status transition");
  }

  return db.$transaction(async (transaction) => {
    const updatedEntry = await updateKnowledgeEntryStatus(transaction, entryId, nextStatus);

    await createAuditLog(transaction, {
      action: "knowledgeEntry.statusChanged",
      targetType: "knowledgeEntry",
      targetId: updatedEntry.id,
      entryId: updatedEntry.id,
      actorId: actor.id,
      metadata: {
        previousStatus: currentEntry.status,
        nextStatus,
      },
    });

    return mapWorkspaceEntry(updatedEntry);
  });
}

export async function curateEntry(actor: SessionUser, entryId: string, input: CurateEntryInput) {
  if (!canCurateEntry(actor)) {
    throw new AuthorizationError();
  }

  const currentEntry = await findEditableEntryById(actor.id, actor.role, entryId);

  if (!currentEntry) {
    throw new NotFoundError("Knowledge entry not found");
  }

  // ⚠️ SENIOR NOTE: Curation only applies to published content; boosting a draft would quietly distort workspace ordering without affecting the public search surface.
  if (currentEntry.status !== EntryStatus.PUBLISHED) {
    throw new ConflictError("Only published entries can be curated");
  }

  return db.$transaction(async (transaction) => {
    const curatedEntry = await updateKnowledgeEntryCuration(transaction, entryId, {
      isFeatured: input.isFeatured,
      manualBoost: input.manualBoost,
      curationNotes: input.curationNotes ?? null,
      curatedById: actor.id,
    });

    await createAuditLog(transaction, {
      action: "knowledgeEntry.curated",
      targetType: "knowledgeEntry",
      targetId: curatedEntry.id,
      entryId: curatedEntry.id,
      actorId: actor.id,
      metadata: input,
    });

    return mapWorkspaceEntry(curatedEntry);
  });
}
