/**
 * What this file does:
 * Reads and writes the session cookie contract so pages and API routes resolve the same authenticated user.
 * What calls it:
 * src/services/authService.ts, src/lib/auth/apiAuth.ts, and server components like src/app/page.tsx.
 * What it calls:
 * src/lib/env.ts for cookie configuration and src/repositories/sessionRepository.ts for the backing session lookup.
 * One thing a junior engineer would likely get wrong when writing something similar:
 * Validating the cookie shape but forgetting to verify the server-side session row, which would let deleted sessions keep working.
 */
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

import { env } from "@/lib/env";
import { AuthenticationError } from "@/lib/errors";
import { findSessionByToken, invalidateSessionByToken } from "@/repositories/sessionRepository";

import type { AuthSession } from "./types";

export function createSessionToken() {
  return randomBytes(24).toString("hex");
}

export function getSessionExpirationDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.SESSION_TTL_DAYS);
  return expiresAt;
}

export async function getServerSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(env.SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return getSessionFromToken(token);
}

export async function getSessionFromToken(token: string): Promise<AuthSession | null> {
  const session = await findSessionByToken(token);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    // ⚠️ SENIOR NOTE: Expired sessions are deleted eagerly so a stale cookie cannot keep triggering database reads forever.
    await invalidateSessionByToken(token);
    return null;
  }

  return {
    token: session.token,
    expiresAt: session.expiresAt,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    },
  };
}

export async function requireServerSession() {
  const session = await getServerSession();

  if (!session) {
    throw new AuthenticationError();
  }

  return session;
}
