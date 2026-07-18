import type { EntryStatus, UserRole } from "@prisma/client";

export type SearchResultEntry = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: EntryStatus;
  isFeatured: boolean;
  manualBoost: number;
  publishedAt: Date | null;
  updatedAt: Date;
  authorId: string;
  authorName: string;
  tags: string[];
  score: number;
};

export type WorkspaceEntry = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  status: EntryStatus;
  isFeatured: boolean;
  manualBoost: number;
  curationNotes: string | null;
  authorId: string;
  authorName: string;
  publishedAt: Date | null;
  updatedAt: Date;
  tags: string[];
};

export type SessionSummary = {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
  expiresAt: string;
};
