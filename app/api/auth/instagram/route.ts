import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildInstagramBusinessLoginUrl } from "@/lib/instagram-business-oauth";
import {
  getInstagramEnvDebug,
  isInstagramConfigured,
} from "@/lib/instagram-env";
import {
  redirectToAccounts,
  resolveOAuthLocale,
  setInstagramOAuthCookies,
} from "@/lib/instagram-oauth-session";
import { createClient } from "@/lib/supabase-server";

function redirectToLogin(request: NextRequest, locale: ReturnType<typeof resolveOAuthLocale>) {
  return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
}

export async function GET(request: NextRequest) {
  const locale = resolveOAuthLocale(request.nextUrl.searchParams.get("locale"));

  if (!isInstagramConfigured()) {
    const instagramEnv = getInstagramEnvDebug();
    console.warn(
      "[posty/instagram-oauth] Blocked — missing:",
      instagramEnv.missing.join(", ") || "unknown",
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
  const response = NextResponse.redirect(buildInstagramBusinessLoginUrl(state));
  setInstagramOAuthCookies(response, state, locale);

  return response;
}
