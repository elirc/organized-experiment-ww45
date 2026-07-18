/**
 * What this file does:
 * Encapsulates all knowledge-entry reads and writes, including the PostgreSQL full-text search query and ownership-scoped workspace queries.
 * What calls it:
 * src/services/knowledgeEntryService.ts and src/services/tagService.ts.
 * What it calls:
 * src/lib/db.ts for Prisma access and PostgreSQL raw SQL through Prisma.sql.
 * One thing a junior engineer would likely get wrong when writing something similar:
 * Mixing permission rules into the query code and creating a tangle where you can no longer tell whether a bug is in authorization or data access.
 */
import { EntryStatus, Prisma, type PrismaClient, type UserRole } from "@prisma/client";

import { db } from "@/lib/db";
import type { SearchResultEntry, WorkspaceEntry } from "@/types/knowledge";

type DbLike = PrismaClient | Prisma.TransactionClient;

type SearchEntriesInput = {
  query: string;
  tagSlugs: string[];
  featuredOnly: boolean;
  page: number;
  pageSize: number;
};

type WorkspaceListInput = {
  actorId: string;
  actorRole: UserRole;
  statuses: EntryStatus[];
  page: number;
  pageSize: number;
};

export async function findPublishedEntryBySlug(slug: string) {
  return db.knowledgeEntry.findFirst({
    where: {
      slug,
      status: EntryStatus.PUBLISHED,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });
}

export async function findWorkspaceEntryById(actorId: string, actorRole: UserRole, entryId: string) {
  return db.knowledgeEntry.findFirst({
    where: {
      id: entryId,
      ...(actorRole === "ADMIN"
        ? {}
        : {
            OR: [
              { status: EntryStatus.PUBLISHED },
              { authorId: actorId },
            ],
          }),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });
}

export async function findEditableEntryById(actorId: string, actorRole: UserRole, entryId: string) {
  return db.knowledgeEntry.findFirst({
    where: {
      id: entryId,
      ...(actorRole === "ADMIN" ? {} : { authorId: actorId }),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });
}

export async function findEntryBySlug(slug: string, excludeId?: string) {
  return db.knowledgeEntry.findFirst({
    where: {
      slug,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
}

export async function listWorkspaceEntries(input: WorkspaceListInput) {
  const where: Prisma.KnowledgeEntryWhereInput = {
    // ⚠️ SENIOR NOTE: Ownership scoping belongs in the repository query as well as the service guard, otherwise refactors can reintroduce draft leakage.
    ...(input.actorRole === "ADMIN" ? {} : { authorId: input.actorId }),
    ...(input.statuses.length > 0
      ? {
          status: {
            in: input.statuses,
          },
        }
      : {}),
  };

  const [items, totalCount] = await Promise.all([
    db.knowledgeEntry.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    db.knowledgeEntry.count({ where }),
  ]);

  return {
    items: items.map(mapWorkspaceEntry),
    totalCount,
  };
}

export async function searchPublishedEntries(input: SearchEntriesInput) {
  const offset = (input.page - 1) * input.pageSize;
  const tagFilter =
    input.tagSlugs.length === 0
      ? Prisma.sql`TRUE`
      : Prisma.sql`
          EXISTS (
            SELECT 1
            FROM "KnowledgeEntryTag" AS ket_filter
            INNER JOIN "Tag" AS tag_filter
              ON tag_filter."id" = ket_filter."tagId"
            WHERE ket_filter."entryId" = entry."id"
              AND tag_filter."slug" IN (${Prisma.join(input.tagSlugs)})
          )
        `;

  const featureFilter = input.featuredOnly ? Prisma.sql`entry."isFeatured" = TRUE` : Prisma.sql`TRUE`;
  const hasQuery = input.query.trim().length > 0;

  const rows = await db.$queryRaw<
    Array<
      SearchResultEntry & {
        totalCount: bigint;
      }
    >
  >(Prisma.sql`
    WITH ranked_entries AS (
      SELECT
        entry."id",
        entry."slug",
        entry."title",
        entry."summary",
        entry."status",
        entry."isFeatured",
        entry."manualBoost",
        entry."publishedAt",
        entry."updatedAt",
        author."id" AS "authorId",
        author."name" AS "authorName",
        COALESCE(array_agg(DISTINCT tag."name") FILTER (WHERE tag."name" IS NOT NULL), ARRAY[]::text[]) AS "tags",
        ${hasQuery
          ? Prisma.sql`
            ts_rank_cd(
              setweight(to_tsvector('english', COALESCE(entry."title", '')), 'A') ||
              setweight(to_tsvector('english', COALESCE(entry."summary", '')), 'B') ||
              setweight(to_tsvector('english', COALESCE(entry."content", '')), 'C') ||
              setweight(to_tsvector('english', COALESCE(string_agg(DISTINCT tag."name", ' '), '')), 'B'),
              websearch_to_tsquery('english', ${input.query})
            )
          `
          : Prisma.sql`0`} AS "textRank"
      FROM "KnowledgeEntry" AS entry
      INNER JOIN "User" AS author
        ON author."id" = entry."authorId"
      LEFT JOIN "KnowledgeEntryTag" AS ket
        ON ket."entryId" = entry."id"
      LEFT JOIN "Tag" AS tag
        ON tag."id" = ket."tagId"
      WHERE entry."status" = 'PUBLISHED'
        AND ${featureFilter}
        AND ${tagFilter}
      GROUP BY entry."id", author."id", author."name"
      ${hasQuery
        ? Prisma.sql`
          HAVING (
            setweight(to_tsvector('english', COALESCE(entry."title", '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(entry."summary", '')), 'B') ||
            setweight(to_tsvector('english', COALESCE(entry."content", '')), 'C') ||
            setweight(to_tsvector('english', COALESCE(string_agg(DISTINCT tag."name", ' '), '')), 'B')
          ) @@ websearch_to_tsquery('english', ${input.query})
        `
        : Prisma.sql``}
    )
    SELECT
      "id",
      "slug",
      "title",
      "summary",
      "status",
      "isFeatured",
      "manualBoost",
      "publishedAt",
      "updatedAt",
      "authorId",
      "authorName",
      "tags",
      (
        "textRank" +
        CASE WHEN "isFeatured" THEN 1.5 ELSE 0 END +
        ("manualBoost" * 0.15)
      ) AS "score",
      COUNT(*) OVER() AS "totalCount"
    FROM ranked_entries
    ORDER BY "score" DESC, "publishedAt" DESC NULLS LAST, "updatedAt" DESC
    LIMIT ${input.pageSize}
    OFFSET ${offset};
  `);

  return {
    items: rows.map((row) => ({
      ...row,
      score: Number(row.score),
      totalCount: undefined,
    })) as SearchResultEntry[],
    totalCount: rows.length > 0 ? Number(rows[0].totalCount) : 0,
  };
}

export async function createKnowledgeEntry(
  client: DbLike,
  input: {
    slug: string;
    title: string;
    summary: string;
    content: string;
    authorId: string;
    tagIds: string[];
  },
) {
  return client.knowledgeEntry.create({
    data: {
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      content: input.content,
      authorId: input.authorId,
      tags: {
        create: input.tagIds.map((tagId) => ({ tagId })),
      },
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });
}

export async function updateKnowledgeEntry(
  client: DbLike,
  entryId: string,
  input: {
    slug: string;
    title: string;
    summary: string;
    content: string;
    tagIds: string[];
  },
) {
  return client.knowledgeEntry.update({
    where: { id: entryId },
    data: {
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      content: input.content,
      tags: {
        deleteMany: {},
        create: input.tagIds.map((tagId) => ({ tagId })),
      },
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });
}

export async function updateKnowledgeEntryStatus(
  client: DbLike,
  entryId: string,
  status: EntryStatus,
) {
  return client.knowledgeEntry.update({
    where: { id: entryId },
    data: {
      status,
      publishedAt: status === EntryStatus.PUBLISHED ? new Date() : null,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });
}

export async function updateKnowledgeEntryCuration(
  client: DbLike,
  entryId: string,
  input: {
    isFeatured: boolean;
    manualBoost: number;
    curationNotes: string | null;
    curatedById: string;
  },
) {
  return client.knowledgeEntry.update({
    where: { id: entryId },
    data: {
      isFeatured: input.isFeatured,
      manualBoost: input.manualBoost,
      curationNotes: input.curationNotes,
      curatedById: input.curatedById,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });
}

export function mapWorkspaceEntry(
  entry: Awaited<ReturnType<typeof findPublishedEntryBySlug>> extends infer T
    ? NonNullable<T>
    : never,
): WorkspaceEntry {
  return {
    id: entry.id,
    slug: entry.slug,
    title: entry.title,
    summary: entry.summary,
    content: entry.content,
    status: entry.status,
    isFeatured: entry.isFeatured,
    manualBoost: entry.manualBoost,
    curationNotes: entry.curationNotes,
    authorId: entry.author.id,
    authorName: entry.author.name,
    publishedAt: entry.publishedAt,
    updatedAt: entry.updatedAt,
    tags: entry.tags.map((entryTag) => entryTag.tag.name),
  };
}
