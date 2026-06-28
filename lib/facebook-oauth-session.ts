import { NextResponse, type NextRequest } from "next/server";
import { routing, type Locale } from "@/i18n/routing";

export const FACEBOOK_OAUTH_STATE_COOKIE = "facebook_oauth_state";
export const FACEBOOK_OAUTH_LOCALE_COOKIE = "facebook_oauth_locale";
export const FACEBOOK_OAUTH_COOKIE_MAX_AGE = 60 * 10;

export function resolveOAuthLocale(value: string | null | undefined): Locale {
  if (value && routing.locales.includes(value as Locale)) {
    return value as Locale;
  }

  return routing.defaultLocale;
}

export function redirectToAccountsAfterFacebook(
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
  response.cookies.delete(FACEBOOK_OAUTH_STATE_COOKIE);
  response.cookies.delete(FACEBOOK_OAUTH_LOCALE_COOKIE);
  return response;
}

export function setFacebookOAuthCookies(
  response: NextResponse,
  state: string,
  locale: Locale,
) {
  response.cookies.set(FACEBOOK_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: FACEBOOK_OAUTH_COOKIE_MAX_AGE,
    path: "/",
  });

  response.cookies.set(FACEBOOK_OAUTH_LOCALE_COOKIE, locale, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: FACEBOOK_OAUTH_COOKIE_MAX_AGE,
    path: "/",
  });
}
