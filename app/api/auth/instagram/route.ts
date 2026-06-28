import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildInstagramOAuthUrl } from "@/lib/meta-oauth";
import { isMetaConfigured } from "@/lib/meta-env";
import {
  redirectToAccounts,
  resolveOAuthLocale,
  setInstagramOAuthCookies,
} from "@/lib/instagram-oauth-session";
import { createClient } from "@/lib/supabase-server";

const INSTAGRAM_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_manage_comments",
  "ads_management",
] as const;

function redirectToLogin(request: NextRequest, locale: ReturnType<typeof resolveOAuthLocale>) {
  return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
}

export async function GET(request: NextRequest) {
  const locale = resolveOAuthLocale(request.nextUrl.searchParams.get("locale"));

  if (!isMetaConfigured()) {
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
