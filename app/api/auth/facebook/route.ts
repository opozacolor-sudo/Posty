import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildFacebookOAuthUrl } from "@/lib/meta-oauth";
import {
  getMetaEnvDebug,
  isMetaConfigured,
  logMetaEnvAtStartup,
} from "@/lib/meta-env";
import {
  redirectToAccountsAfterFacebook,
  resolveOAuthLocale,
  setFacebookOAuthCookies,
} from "@/lib/facebook-oauth-session";
import { createClient } from "@/lib/supabase-server";

function redirectToLogin(request: NextRequest, locale: ReturnType<typeof resolveOAuthLocale>) {
  return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
}

export async function GET(request: NextRequest) {
  logMetaEnvAtStartup();

  const locale = resolveOAuthLocale(request.nextUrl.searchParams.get("locale"));

  if (!isMetaConfigured()) {
    const metaEnv = getMetaEnvDebug();
    console.warn(
      "[posty/facebook-oauth] Blocked — missing:",
      metaEnv.missing.join(", ") || "unknown",
    );
    return redirectToAccountsAfterFacebook(request, locale, {
      error: "facebook_not_configured",
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
  const response = NextResponse.redirect(buildFacebookOAuthUrl(state));
  setFacebookOAuthCookies(response, state, locale);

  return response;
}
