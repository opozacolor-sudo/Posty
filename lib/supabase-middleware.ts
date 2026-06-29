import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { locales, type Locale } from "@/i18n/routing";
import { isOnboardingInProgress, isOnboardingRoute } from "./onboarding";
import { isLegalRoute } from "./legal";
import { assertSupabaseConfigured } from "./supabase-env";

function getLocaleFromPath(pathname: string): Locale {
  const segment = pathname.split("/")[1];
  if (segment && (locales as readonly string[]).includes(segment)) {
    return segment as Locale;
  }
  return "en";
}

function getPathWithoutLocale(pathname: string): string {
  const locale = getLocaleFromPath(pathname);
  if (pathname.startsWith(`/${locale}/`)) {
    return pathname.slice(locale.length + 1);
  }

  if (pathname === `/${locale}`) {
    return "/";
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export async function updateSession(
  request: NextRequest,
  response?: NextResponse,
) {
  let supabaseResponse =
    response ??
    NextResponse.next({
      request,
    });

  let url: string;
  let anonKey: string;

  try {
    ({ url, anonKey } = assertSupabaseConfigured());
  } catch {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const locale = getLocaleFromPath(pathname);
  const pathWithoutLocale = getPathWithoutLocale(pathname);

  if (isLegalRoute(pathWithoutLocale)) {
    return supabaseResponse;
  }

  // Refresh Supabase session cookies, but never redirect API callers to the login page.
  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  const isAuthCallback = pathname.startsWith("/auth");
  const isLoginPage = pathWithoutLocale === "/login";
  const isPublicRoute = isAuthCallback || isLoginPage || isLegalRoute(pathWithoutLocale);

  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}/login`;
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = isOnboardingInProgress(user)
      ? `/${locale}/onboarding`
      : `/${locale}/dashboard`;
    return NextResponse.redirect(redirectUrl);
  }

  if (
    user &&
    isOnboardingInProgress(user) &&
    !isOnboardingRoute(pathWithoutLocale) &&
    !isLegalRoute(pathWithoutLocale) &&
    !isPublicRoute
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}/onboarding`;
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
