/**
 * What this file does:
 * Centralizes role and ownership rules for reading, editing, publishing, and curating knowledge entries.
 * What calls it:
 * src/lib/auth/apiAuth.ts and src/services/knowledgeEntryService.ts use these helpers before performing protected actions.
 * What it calls:
 * This file is intentionally pure so permission decisions remain easy to test without database access.
 * One thing a junior engineer would likely get wrong when writing something similar:
 * Checking only the user's role and forgetting ownership rules, which is how editors end up mutating another editor's drafts.
 */
import { EntryStatus, type UserRole } from "@prisma/client";

import type { SessionUser } from "@/lib/auth/types";

export type EntryPermissionSubject = {
  authorId: string;
  status: EntryStatus;
};

const roleOrder: Record<UserRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
};

export function hasMinimumRole(role: UserRole, requiredRole: UserRole) {
  return roleOrder[role] >= roleOrder[requiredRole];
}

export function canAccessWorkspace(user: SessionUser) {
  return hasMinimumRole(user.role, "EDITOR");
}

export function canCreateEntry(user: SessionUser) {
  return hasMinimumRole(user.role, "EDITOR");
}

export function canCurateEntry(user: SessionUser) {
  return hasMinimumRole(user.role, "ADMIN");
}

export function canEditEntry(user: SessionUser, entry: EntryPermissionSubject) {
  if (user.role === "ADMIN") {
    return true;
  }

  return user.role === "EDITOR" && entry.authorId === user.id;
}

export function canReadEntryInWorkspace(user: SessionUser, entry: EntryPermissionSubject) {
  if (user.role === "ADMIN") {
    return true;
  }

  if (entry.status === EntryStatus.PUBLISHED) {
    return true;
  }

  return entry.authorId === user.id;
}

export function canTransitionEntry(
  user: SessionUser,
  entry: EntryPermissionSubject,
  nextStatus: EntryStatus,
) {
  if (!canEditEntry(user, entry)) {
    return false;
  }

  if (entry.status === EntryStatus.ARCHIVED && nextStatus === EntryStatus.DRAFT) {
    return user.role === "ADMIN";
  }

  return isValidStatusTransition(entry.status, nextStatus);
}

export function isValidStatusTransition(currentStatus: EntryStatus, nextStatus: EntryStatus) {
  if (currentStatus === nextStatus) {
    return true;
  }

  const allowedTransitions: Record<EntryStatus, EntryStatus[]> = {
    DRAFT: [EntryStatus.PUBLISHED, EntryStatus.ARCHIVED],
    PUBLISHED: [EntryStatus.ARCHIVED],
    ARCHIVED: [EntryStatus.DRAFT],
  };

  // ⚠️ SENIOR NOTE: Keeping this matrix centralized prevents hidden workflow drift when a new status is added later.
  return allowedTransitions[currentStatus].includes(nextStatus);
}
