import { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/auth/apiAuth";
import { apiError, apiOk } from "@/lib/http/responses";

export async function GET(request: NextRequest) {
  try {
    const session = await requireApiSession(request);

    return apiOk({
      user: session.user,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    return apiError(error);
  }
}
