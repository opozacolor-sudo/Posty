import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeInstagramCodeForToken,
  exchangeInstagramForLongLivedToken,
  fetchInstagramUsername,
} from "@/lib/instagram-business-oauth";
import { getInstagramEnvDebug, isInstagramConfigured } from "@/lib/instagram-env";
import {
  INSTAGRAM_OAUTH_LOCALE_COOKIE,
  INSTAGRAM_OAUTH_STATE_COOKIE,
  redirectToAccounts,
  resolveOAuthLocale,
} from "@/lib/instagram-oauth-session";
import {
  mapSaveFailureToOAuthErrorKey,
  upsertConnectedAccount,
} from "@/lib/save-connected-account";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const locale = resolveOAuthLocale(
    request.cookies.get(INSTAGRAM_OAUTH_LOCALE_COOKIE)?.value,
  );
  const { searchParams } = request.nextUrl;

  const oauthError = searchParams.get("error");
  if (oauthError) {
    return redirectToAccounts(request, locale, {
      error: "instagram_denied",
    });
  }

  if (!isInstagramConfigured()) {
    const instagramEnv = getInstagramEnvDebug();
    console.warn(
      "[posty/instagram-oauth] Callback blocked — missing:",
      instagramEnv.missing,
    );
    return redirectToAccounts(request, locale, {
      error: "instagram_not_configured",
    });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get(INSTAGRAM_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return redirectToAccounts(request, locale, {
      error: "instagram_invalid_state",
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
    response.cookies.delete(INSTAGRAM_OAUTH_STATE_COOKIE);
    response.cookies.delete(INSTAGRAM_OAUTH_LOCALE_COOKIE);
    return response;
  }

  try {
    const shortLived = await exchangeInstagramCodeForToken(code);
    const longLived = await exchangeInstagramForLongLivedToken(shortLived.accessToken);
    const username =
      (await fetchInstagramUsername(longLived.accessToken)) ?? shortLived.userId;

    const tokenExpiresAt = longLived.expiresIn
      ? new Date(Date.now() + longLived.expiresIn * 1000).toISOString()
      : null;

    const saveResult = await upsertConnectedAccount({
      user_id: user.id,
      platform: "instagram",
      account_name: username,
      access_token: longLived.accessToken,
      refresh_token: null,
      token_expires_at: tokenExpiresAt,
      is_active: true,
    });

    if (!saveResult.ok) {
      return redirectToAccounts(request, locale, {
        error: mapSaveFailureToOAuthErrorKey(saveResult.reason, "instagram"),
      });
    }

    return redirectToAccounts(request, locale, {
      connected: "instagram",
    });
  } catch (error) {
    console.error("[posty/instagram-oauth] Callback failed:", error);
    return redirectToAccounts(request, locale, {
      error: "instagram_token_failed",
    });
  }
}
