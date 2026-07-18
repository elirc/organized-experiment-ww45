/**
 * What this file does:
 * Resolves the authenticated user from API requests and applies reusable role guards before route logic runs.
 * What calls it:
 * API route handlers under src/app/api/auth, src/app/api/me, and src/app/api/knowledge call requireApiSession() or requireApiRole().
 * What it calls:
 * src/lib/auth/session.ts to resolve the server-side session and src/lib/auth/permissions.ts for the role threshold check.
 * One thing a junior engineer would likely get wrong when writing something similar:
 * Repeating hand-written role checks in each route, which leads to inconsistent 401 vs 403 behavior over time.
 */
import type { UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";

import { hasMinimumRole } from "@/lib/auth/permissions";
import { getSessionFromToken } from "@/lib/auth/session";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import { env } from "@/lib/env";

export async function requireApiSession(request: NextRequest) {
  const token = request.cookies.get(env.SESSION_COOKIE_NAME)?.value;

  if (!token) {
    throw new AuthenticationError();
  }

  const session = await getSessionFromToken(token);

  if (!session) {
    throw new AuthenticationError();
  }

  return session;
}

export async function requireApiRole(request: NextRequest, minimumRole: UserRole) {
  const session = await requireApiSession(request);

  // ⚠️ SENIOR NOTE: Separating 401 from 403 is important for clients and logs; anonymous and under-privileged requests are not the same failure mode.
  if (!hasMinimumRole(session.user.role, minimumRole)) {
    throw new AuthorizationError();
  }

  return session;
}
