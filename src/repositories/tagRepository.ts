import type { Prisma, PrismaClient } from "@prisma/client";

import { db } from "@/lib/db";
import { dedupe, slugify } from "@/lib/utils";

type DbLike = PrismaClient | Prisma.TransactionClient;

export async function listTags() {
  return db.tag.findMany({
    orderBy: { name: "asc" },
  });
}

export async function upsertTagsByNames(client: DbLike, tagNames: string[]) {
  const normalizedTags = dedupe(tagNames.map((tag) => tag.trim())).map((name) => ({
    name,
    slug: slugify(name),
  }));

  await Promise.all(
    normalizedTags.map((tag) =>
      client.tag.upsert({
        where: { slug: tag.slug },
        update: { name: tag.name },
        create: tag,
      }),
    ),
  );

  return client.tag.findMany({
    where: {
      slug: {
        in: normalizedTags.map((tag) => tag.slug),
      },
    },
  });
}
