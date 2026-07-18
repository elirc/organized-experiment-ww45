import { PrismaClient } from "@prisma/client";

declare global {
  var __knowledgeHubPrisma__: PrismaClient | undefined;
}

export const db =
  global.__knowledgeHubPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__knowledgeHubPrisma__ = db;
}
