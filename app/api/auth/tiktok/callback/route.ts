import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeTikTokCodeForToken,
  fetchTikTokDisplayName,
} from "@/lib/tiktok-oauth";
import { getTikTokEnvDebug, isTikTokConfigured } from "@/lib/tiktok-env";
import {
  TIKTOK_OAUTH_LOCALE_COOKIE,
  TIKTOK_OAUTH_STATE_COOKIE,
  redirectToAccountsAfterTikTok,
  resolveOAuthLocale,
} from "@/lib/tiktok-oauth-session";
import {
  mapSaveFailureToOAuthErrorKey,
  upsertConnectedAccount,
} from "@/lib/save-connected-account";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const locale = resolveOAuthLocale(
    request.cookies.get(TIKTOK_OAUTH_LOCALE_COOKIE)?.value,
  );
  const { searchParams } = request.nextUrl;

  const oauthError = searchParams.get("error");
  if (oauthError) {
    return redirectToAccountsAfterTikTok(request, locale, {
      error: "tiktok_denied",
    });
  }

  if (!isTikTokConfigured()) {
    const tiktokEnv = getTikTokEnvDebug();
    console.warn(
      "[posty/tiktok-oauth] Callback blocked — missing:",
      tiktokEnv.missing,
    );
    return redirectToAccountsAfterTikTok(request, locale, {
      error: "tiktok_not_configured",
    });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get(TIKTOK_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return redirectToAccountsAfterTikTok(request, locale, {
      error: "tiktok_invalid_state",
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
    response.cookies.delete(TIKTOK_OAUTH_STATE_COOKIE);
    response.cookies.delete(TIKTOK_OAUTH_LOCALE_COOKIE);
    return response;
  }

  try {
    const tokens = await exchangeTikTokCodeForToken(code);
    const displayName =
      (await fetchTikTokDisplayName(tokens.accessToken)) ?? tokens.openId ?? "TikTok";

    const tokenExpiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
      : null;

    const saveResult = await upsertConnectedAccount({
      user_id: user.id,
      platform: "tiktok",
      account_name: displayName,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_expires_at: tokenExpiresAt,
      is_active: true,
    });

    if (!saveResult.ok) {
      return redirectToAccountsAfterTikTok(request, locale, {
        error: mapSaveFailureToOAuthErrorKey(saveResult.reason, "tiktok"),
      });
    }

    return redirectToAccountsAfterTikTok(request, locale, {
      connected: "tiktok",
    });
  } catch (error) {
    console.error("[posty/tiktok-oauth] Callback failed:", error);
    return redirectToAccountsAfterTikTok(request, locale, {
      error: "tiktok_token_failed",
    });
  }
}
