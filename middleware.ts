import createIntlMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing, type Locale } from "./i18n/routing";
import { isLegalRoute } from "./lib/legal";
import { updateSession } from "./lib/supabase-middleware";

const intlMiddleware = createIntlMiddleware(routing);

function getPathWithoutLocale(pathname: string): string {
  const segment = pathname.split("/")[1];
  if (segment && routing.locales.includes(segment as Locale)) {
    const stripped = pathname.slice(segment.length + 1) || "/";
    return stripped.startsWith("/") ? stripped : `/${stripped}`;
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const pathWithoutLocale = getPathWithoutLocale(pathname);

  if (isLegalRoute(pathWithoutLocale)) {
    return intlMiddleware(request);
  }

  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/accounts") ||
    pathname.startsWith("/api/chat") ||
    pathname.startsWith("/api/media")
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
