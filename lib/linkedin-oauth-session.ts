import { NextResponse, type NextRequest } from "next/server";
import { routing, type Locale } from "@/i18n/routing";

export const LINKEDIN_OAUTH_STATE_COOKIE = "linkedin_oauth_state";
export const LINKEDIN_OAUTH_LOCALE_COOKIE = "linkedin_oauth_locale";
export const LINKEDIN_OAUTH_COOKIE_MAX_AGE = 60 * 10;

export function resolveOAuthLocale(value: string | null | undefined): Locale {
  if (value && routing.locales.includes(value as Locale)) {
    return value as Locale;
  }

  return routing.defaultLocale;
}

export function redirectToAccountsAfterLinkedIn(
  request: NextRequest,
  locale: Locale,
  params?: Record<string, string>,
) {
  const url = new URL(`/${locale}/accounts`, request.url);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = NextResponse.redirect(url);
  response.cookies.delete(LINKEDIN_OAUTH_STATE_COOKIE);
  response.cookies.delete(LINKEDIN_OAUTH_LOCALE_COOKIE);
  return response;
}

export function setLinkedInOAuthCookies(
  response: NextResponse,
  state: string,
  locale: Locale,
) {
  response.cookies.set(LINKEDIN_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: LINKEDIN_OAUTH_COOKIE_MAX_AGE,
    path: "/",
  });

  response.cookies.set(LINKEDIN_OAUTH_LOCALE_COOKIE, locale, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: LINKEDIN_OAUTH_COOKIE_MAX_AGE,
    path: "/",
  });
}
