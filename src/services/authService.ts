/**
 * What this file does:
 * Owns login, logout, and session serialization so routes do not need to know how credentials map to cookies and database sessions.
 * What calls it:
 * src/app/api/auth/login/route.ts, src/app/api/auth/logout/route.ts, and src/app/api/me/route.ts.
 * What it calls:
 * src/repositories/userRepository.ts, src/repositories/sessionRepository.ts, and src/lib/auth/password.ts.
 * One thing a junior engineer would likely get wrong when writing something similar:
 * Returning different “user not found” and “bad password” errors, which leaks account-enumeration hints to attackers.
 */
import { createSession, invalidateSessionByToken } from "@/repositories/sessionRepository";
import { findUserByEmail } from "@/repositories/userRepository";
import { AuthenticationError } from "@/lib/errors";
import { createSessionToken, getSessionExpirationDate } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import type { AuthSession } from "@/lib/auth/types";

export async function loginWithEmail(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new AuthenticationError("Invalid email or password");
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    // ⚠️ SENIOR NOTE: Keep the same outward-facing error for missing users and bad passwords to avoid account enumeration hints.
    throw new AuthenticationError("Invalid email or password");
  }

  const token = createSessionToken();
  const expiresAt = getSessionExpirationDate();

  await createSession(user.id, token, expiresAt);

  return {
    token,
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  } satisfies AuthSession;
}

export async function logoutByToken(token: string) {
  await invalidateSessionByToken(token);
}
