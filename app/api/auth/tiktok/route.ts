import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildTikTokOAuthUrl } from "@/lib/tiktok-oauth";
import { getTikTokEnvDebug, isTikTokConfigured } from "@/lib/tiktok-env";
import {
  redirectToAccountsAfterTikTok,
  resolveOAuthLocale,
  setTikTokOAuthCookies,
} from "@/lib/tiktok-oauth-session";
import { createClient } from "@/lib/supabase-server";

function redirectToLogin(request: NextRequest, locale: ReturnType<typeof resolveOAuthLocale>) {
  return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
}

export async function GET(request: NextRequest) {
  const locale = resolveOAuthLocale(request.nextUrl.searchParams.get("locale"));

  if (!isTikTokConfigured()) {
    const tiktokEnv = getTikTokEnvDebug();
    console.warn(
      "[posty/tiktok-oauth] Blocked — missing:",
      tiktokEnv.missing.join(", ") || "unknown",
    );
    return redirectToAccountsAfterTikTok(request, locale, {
      error: "tiktok_not_configured",
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
  const response = NextResponse.redirect(buildTikTokOAuthUrl(state));
  setTikTokOAuthCookies(response, state, locale);

  return response;
}
