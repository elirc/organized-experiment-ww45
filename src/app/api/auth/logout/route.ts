import { env } from "@/lib/env";
import { apiError, apiOk } from "@/lib/http/responses";
import { logoutByToken } from "@/services/authService";

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const token = cookieHeader
      ?.split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${env.SESSION_COOKIE_NAME}=`))
      ?.split("=")[1];

    if (token) {
      await logoutByToken(token);
    }

    const response = apiOk({ success: true });
    response.cookies.set(env.SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    return apiError(error);
  }
}
