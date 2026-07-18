import { db } from "@/lib/db";

export async function createSession(userId: string, token: string, expiresAt: Date) {
  return db.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
}

export async function findSessionByToken(token: string) {
  return db.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  });
}

export async function invalidateSessionByToken(token: string) {
  return db.session.deleteMany({
    where: { token },
  });
}
