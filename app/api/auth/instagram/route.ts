import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildInstagramOAuthUrl } from "@/lib/meta-oauth";
import {
  getMetaEnvDebug,
  isMetaConfigured,
  logMetaEnvAtStartup,
} from "@/lib/meta-env";
import {
  redirectToAccounts,
  resolveOAuthLocale,
  setInstagramOAuthCookies,
} from "@/lib/instagram-oauth-session";
import { createClient } from "@/lib/supabase-server";

// Development mode: only default Facebook Login scopes (no App Review required).
// Content Publishing scopes (e.g. instagram_business_content_publish) require App Review.
const INSTAGRAM_OAUTH_SCOPES = ["email", "public_profile"] as const;

function redirectToLogin(request: NextRequest, locale: ReturnType<typeof resolveOAuthLocale>) {
  return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
}

export async function GET(request: NextRequest) {
  logMetaEnvAtStartup();

  const metaEnv = getMetaEnvDebug();
  console.log("[posty/instagram-oauth] GET /api/auth/instagram env:", {
    META_APP_ID: metaEnv.appId,
    META_APP_SECRET: metaEnv.appSecretPreview,
    META_APP_SECRET_present: metaEnv.appSecretPresent,
    META_REDIRECT_URI: metaEnv.redirectUri,
    configured: metaEnv.configured,
    missing: metaEnv.missing,
  });

  const locale = resolveOAuthLocale(request.nextUrl.searchParams.get("locale"));

  if (!isMetaConfigured()) {
    console.warn(
      "[posty/instagram-oauth] Blocked — missing:",
      metaEnv.missing.join(", ") || "unknown",
    );
    return redirectToAccounts(request, locale, {
      error: "instagram_not_configured",
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
  const response = NextResponse.redirect(
    buildInstagramOAuthUrl(state, INSTAGRAM_OAUTH_SCOPES),
  );
  setInstagramOAuthCookies(response, state, locale);

  return response;
}
