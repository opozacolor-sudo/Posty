import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeLinkedInCodeForToken,
  fetchLinkedInDisplayName,
} from "@/lib/linkedin-oauth";
import { getLinkedInEnvDebug, isLinkedInConfigured } from "@/lib/linkedin-env";
import {
  LINKEDIN_OAUTH_LOCALE_COOKIE,
  LINKEDIN_OAUTH_STATE_COOKIE,
  redirectToAccountsAfterLinkedIn,
  resolveOAuthLocale,
} from "@/lib/linkedin-oauth-session";
import {
  mapSaveFailureToOAuthErrorKey,
  upsertConnectedAccount,
} from "@/lib/save-connected-account";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const locale = resolveOAuthLocale(
    request.cookies.get(LINKEDIN_OAUTH_LOCALE_COOKIE)?.value,
  );
  const { searchParams } = request.nextUrl;

  const oauthError = searchParams.get("error");
  if (oauthError) {
    return redirectToAccountsAfterLinkedIn(request, locale, {
      error: "linkedin_denied",
    });
  }

  if (!isLinkedInConfigured()) {
    const linkedInEnv = getLinkedInEnvDebug();
    console.warn(
      "[posty/linkedin-oauth] Callback blocked — missing:",
      linkedInEnv.missing,
    );
    return redirectToAccountsAfterLinkedIn(request, locale, {
      error: "linkedin_not_configured",
    });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get(LINKEDIN_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return redirectToAccountsAfterLinkedIn(request, locale, {
      error: "linkedin_invalid_state",
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const response = NextResponse.redirect(
      new URL(`/${locale}/login`, request.url),
    );
    response.cookies.delete(LINKEDIN_OAUTH_STATE_COOKIE);
    response.cookies.delete(LINKEDIN_OAUTH_LOCALE_COOKIE);
    return response;
  }

  try {
    const tokens = await exchangeLinkedInCodeForToken(code);
    const displayName =
      (await fetchLinkedInDisplayName(tokens.accessToken)) ?? "LinkedIn";

    const tokenExpiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
      : null;

    const saveResult = await upsertConnectedAccount({
      user_id: user.id,
      platform: "linkedin",
      account_name: displayName,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_expires_at: tokenExpiresAt,
      is_active: true,
    });

    if (!saveResult.ok) {
      return redirectToAccountsAfterLinkedIn(request, locale, {
        error: mapSaveFailureToOAuthErrorKey(saveResult.reason, "linkedin"),
      });
    }

    return redirectToAccountsAfterLinkedIn(request, locale, {
      connected: "linkedin",
    });
  } catch (error) {
    console.error("[posty/linkedin-oauth] Callback failed:", error);
    return redirectToAccountsAfterLinkedIn(request, locale, {
      error: "linkedin_token_failed",
    });
  }
}
