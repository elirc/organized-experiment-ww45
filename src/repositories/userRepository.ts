import { db } from "@/lib/db";

export async function findUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

export async function findUserById(id: string) {
  return db.user.findUnique({
    where: { id },
  });
}
