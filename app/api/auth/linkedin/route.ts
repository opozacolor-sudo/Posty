import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildLinkedInOAuthUrl } from "@/lib/linkedin-oauth";
import { getLinkedInEnvDebug, isLinkedInConfigured } from "@/lib/linkedin-env";
import {
  redirectToAccountsAfterLinkedIn,
  resolveOAuthLocale,
  setLinkedInOAuthCookies,
} from "@/lib/linkedin-oauth-session";
import { createClient } from "@/lib/supabase-server";

function redirectToLogin(request: NextRequest, locale: ReturnType<typeof resolveOAuthLocale>) {
  return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
}

export async function GET(request: NextRequest) {
  const locale = resolveOAuthLocale(request.nextUrl.searchParams.get("locale"));

  if (!isLinkedInConfigured()) {
    const linkedInEnv = getLinkedInEnvDebug();
    console.warn(
      "[posty/linkedin-oauth] Blocked — missing:",
      linkedInEnv.missing.join(", ") || "unknown",
    );
    return redirectToAccountsAfterLinkedIn(request, locale, {
      error: "linkedin_not_configured",
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
  const response = NextResponse.redirect(buildLinkedInOAuthUrl(state));
  setLinkedInOAuthCookies(response, state, locale);

  return response;
}
