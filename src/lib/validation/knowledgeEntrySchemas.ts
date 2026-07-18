/**
 * What this file does:
 * Defines the API validation contract for knowledge entry search, mutation, curation, and workflow transitions.
 * What calls it:
 * Route handlers in src/app/api/knowledge/search/route.ts, src/app/api/knowledge/route.ts, and nested knowledge entry route files parse requests with these schemas before calling services.
 * What it calls:
 * src/lib/utils.ts for slug normalization rules used by the mutation schema.
 * One thing a junior engineer would likely get wrong when writing something similar:
 * Validating fields individually but not validating how they relate, like allowing both an empty title and a blank derived slug.
 */
import { EntryStatus } from "@prisma/client";
import { z } from "zod";

import { slugify } from "@/lib/utils";

const tagSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .transform((value) => value.replace(/\s+/g, " "));

export const searchEntriesQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  tags: z.array(z.string().trim()).optional().default([]),
  featuredOnly: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export const workspaceEntriesQuerySchema = z.object({
  status: z.array(z.nativeEnum(EntryStatus)).optional().default([]),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(12),
});

export const saveKnowledgeEntrySchema = z
  .object({
    title: z.string().trim().min(5).max(120),
    slug: z.string().trim().max(140).optional(),
    summary: z.string().trim().min(20).max(240),
    content: z.string().trim().min(40),
    tags: z.array(tagSchema).min(1).max(6),
  })
  .transform((value) => ({
    ...value,
    // Normalize the slug at the validation boundary so downstream services never need to guess how input should be cleaned up.
    slug: slugify(value.slug?.length ? value.slug : value.title),
    tags: value.tags.map((tag) => tag.trim()),
  }))
  .refine((value) => value.slug.length >= 3, {
    message: "Title or slug must generate at least 3 characters",
    path: ["slug"],
  });

export const changeEntryStatusSchema = z.object({
  status: z.nativeEnum(EntryStatus),
});

export const curateEntrySchema = z.object({
  isFeatured: z.boolean(),
  // ⚠️ SENIOR NOTE: The boost ceiling is part product policy, not a UI nicety; without it a single admin could overwhelm text relevance completely.
  manualBoost: z.number().int().min(0).max(25),
  curationNotes: z.string().trim().max(250).optional().nullable(),
});

export type SearchEntriesQuery = z.infer<typeof searchEntriesQuerySchema>;
export type WorkspaceEntriesQuery = z.infer<typeof workspaceEntriesQuerySchema>;
export type SaveKnowledgeEntryInput = z.infer<typeof saveKnowledgeEntrySchema>;
export type ChangeEntryStatusInput = z.infer<typeof changeEntryStatusSchema>;
export type CurateEntryInput = z.infer<typeof curateEntrySchema>;
