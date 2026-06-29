import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildPinterestOAuthUrl } from "@/lib/pinterest-oauth";
import {
  getPinterestEnvDebug,
  isPinterestConfigured,
} from "@/lib/pinterest-env";
import {
  redirectToAccountsAfterPinterest,
  resolveOAuthLocale,
  setPinterestOAuthCookies,
} from "@/lib/pinterest-oauth-session";
import { createClient } from "@/lib/supabase-server";

function redirectToLogin(request: NextRequest, locale: ReturnType<typeof resolveOAuthLocale>) {
  return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
}

export async function GET(request: NextRequest) {
  const locale = resolveOAuthLocale(request.nextUrl.searchParams.get("locale"));

  if (!isPinterestConfigured()) {
    const pinterestEnv = getPinterestEnvDebug();
    console.warn(
      "[posty/pinterest-oauth] Blocked — missing:",
      pinterestEnv.missing.join(", ") || "unknown",
    );
    return redirectToAccountsAfterPinterest(request, locale, {
      error: "pinterest_not_configured",
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
  const response = NextResponse.redirect(buildPinterestOAuthUrl(state));
  setPinterestOAuthCookies(response, state, locale);

  return response;
}
