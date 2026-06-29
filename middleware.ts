import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase-middleware";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/auth") ||
    request.nextUrl.pathname.startsWith("/api/auth") ||
    request.nextUrl.pathname.startsWith("/api/accounts") ||
    request.nextUrl.pathname.startsWith("/api/chat") ||
    request.nextUrl.pathname.startsWith("/api/media")
  ) {
    return updateSession(request);
  }

  const intlResponse = intlMiddleware(request);

  if (intlResponse.headers.get("location")) {
    return intlResponse;
  }

  return updateSession(request, intlResponse);
}

export const config = {
  matcher: [
    "/",
    "/(en|ro|es|fr|de|it|pt|ru|ar|zh|ja|ko|hi)/:path*",
    "/auth/:path*",
    "/api/auth/:path*",
    "/api/accounts/:path*",
    "/api/chat/:path*",
    "/api/media/:path*",
  ],
};
