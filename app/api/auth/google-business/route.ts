import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildGoogleBusinessOAuthUrl } from "@/lib/google-business-oauth";
import {
  getGoogleBusinessEnvDebug,
  isGoogleBusinessConfigured,
} from "@/lib/google-business-env";
import {
  redirectToAccountsAfterGoogleBusiness,
  resolveOAuthLocale,
  setGoogleBusinessOAuthCookies,
} from "@/lib/google-business-oauth-session";
import { createClient } from "@/lib/supabase-server";

function redirectToLogin(
  request: NextRequest,
  locale: ReturnType<typeof resolveOAuthLocale>,
) {
  return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
}

export async function GET(request: NextRequest) {
  const env = getGoogleBusinessEnvDebug();
  console.log("[posty/google-business-oauth] GET env:", env);

  const locale = resolveOAuthLocale(request.nextUrl.searchParams.get("locale"));

  if (!isGoogleBusinessConfigured()) {
    return redirectToAccountsAfterGoogleBusiness(request, locale, {
      error: "google_business_not_configured",
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectToLogin(request, locale);
  }

  const state = randomUUID();
  const response = NextResponse.redirect(buildGoogleBusinessOAuthUrl(state));
  setGoogleBusinessOAuthCookies(response, state, locale);

  return response;
}
