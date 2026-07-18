import { env } from "@/lib/env";
import { apiError, apiOk } from "@/lib/http/responses";
import { loginSchema } from "@/lib/validation/authSchemas";
import { loginWithEmail } from "@/services/authService";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const session = await loginWithEmail(body.email, body.password);

    const response = apiOk({
      user: session.user,
      expiresAt: session.expiresAt.toISOString(),
    });

    response.cookies.set(env.SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: session.expiresAt,
    });

    return response;
  } catch (error) {
    return apiError(error);
  }
}
