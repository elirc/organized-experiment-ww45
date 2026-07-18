import type { Prisma, PrismaClient } from "@prisma/client";

import { db } from "@/lib/db";

type DbLike = PrismaClient | Prisma.TransactionClient;

type CreateAuditLogInput = {
  action: string;
  targetType: string;
  targetId: string;
  actorId?: string;
  entryId?: string;
  metadata?: Prisma.InputJsonValue;
};

export async function createAuditLog(client: DbLike = db, input: CreateAuditLogInput) {
  return client.auditLog.create({
    data: input,
  });
}
