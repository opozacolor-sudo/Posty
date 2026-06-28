import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildYouTubeOAuthUrl } from "@/lib/google-oauth";
import { getGoogleEnvDebug, isGoogleConfigured } from "@/lib/google-env";
import {
  redirectToAccountsAfterYouTube,
  resolveOAuthLocale,
  setYouTubeOAuthCookies,
} from "@/lib/youtube-oauth-session";
import { createClient } from "@/lib/supabase-server";

function redirectToLogin(
  request: NextRequest,
  locale: ReturnType<typeof resolveOAuthLocale>,
) {
  return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
}

export async function GET(request: NextRequest) {
  const googleEnv = getGoogleEnvDebug();
  console.log("[posty/youtube-oauth] GET /api/auth/youtube env:", {
    GOOGLE_CLIENT_ID: googleEnv.clientId,
    GOOGLE_CLIENT_SECRET: googleEnv.clientSecretPreview,
    GOOGLE_CLIENT_SECRET_present: googleEnv.clientSecretPresent,
    GOOGLE_REDIRECT_URI: googleEnv.redirectUri,
    configured: googleEnv.configured,
    missing: googleEnv.missing,
  });

  const locale = resolveOAuthLocale(request.nextUrl.searchParams.get("locale"));

  if (!isGoogleConfigured()) {
    return redirectToAccountsAfterYouTube(request, locale, {
      error: "youtube_not_configured",
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
  const response = NextResponse.redirect(buildYouTubeOAuthUrl(state));
  setYouTubeOAuthCookies(response, state, locale);

  return response;
}
