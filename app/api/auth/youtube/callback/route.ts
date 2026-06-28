import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeGoogleCodeForTokens,
  fetchYouTubeChannelName,
} from "@/lib/google-oauth";
import { getGoogleEnvDebug, isGoogleConfigured } from "@/lib/google-env";
import {
  YOUTUBE_OAUTH_LOCALE_COOKIE,
  YOUTUBE_OAUTH_STATE_COOKIE,
  redirectToAccountsAfterYouTube,
  resolveOAuthLocale,
} from "@/lib/youtube-oauth-session";
import { upsertConnectedAccount } from "@/lib/save-connected-account";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const locale = resolveOAuthLocale(
    request.cookies.get(YOUTUBE_OAUTH_LOCALE_COOKIE)?.value,
  );
  const { searchParams } = request.nextUrl;

  const oauthError = searchParams.get("error");
  if (oauthError) {
    return redirectToAccountsAfterYouTube(request, locale, {
      error: "youtube_denied",
    });
  }

  if (!isGoogleConfigured()) {
    const googleEnv = getGoogleEnvDebug();
    console.warn(
      "[posty/youtube-oauth] Callback blocked — missing:",
      googleEnv.missing,
    );
    return redirectToAccountsAfterYouTube(request, locale, {
      error: "youtube_not_configured",
    });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get(YOUTUBE_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return redirectToAccountsAfterYouTube(request, locale, {
      error: "youtube_invalid_state",
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
    response.cookies.delete(YOUTUBE_OAUTH_STATE_COOKIE);
    response.cookies.delete(YOUTUBE_OAUTH_LOCALE_COOKIE);
    return response;
  }

  try {
    const tokens = await exchangeGoogleCodeForTokens(code);
    const channelName = await fetchYouTubeChannelName(tokens.accessToken);

    if (!channelName) {
      return redirectToAccountsAfterYouTube(request, locale, {
        error: "youtube_no_channel",
      });
    }

    const tokenExpiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
      : null;

    const saveResult = await upsertConnectedAccount({
      user_id: user.id,
      platform: "youtube",
      account_name: channelName,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken ?? null,
      token_expires_at: tokenExpiresAt,
      is_active: true,
    });

    if (!saveResult.ok) {
      const errorKey =
        saveResult.reason === "missing_table"
          ? "youtube_save_failed"
          : saveResult.reason === "permission"
            ? "youtube_save_permission"
            : "youtube_save_failed";

      return redirectToAccountsAfterYouTube(request, locale, {
        error: errorKey,
      });
    }

    return redirectToAccountsAfterYouTube(request, locale, {
      connected: "youtube",
    });
  } catch {
    return redirectToAccountsAfterYouTube(request, locale, {
      error: "youtube_token_failed",
    });
  }
}
