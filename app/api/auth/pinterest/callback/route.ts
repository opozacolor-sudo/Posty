import { NextResponse, type NextRequest } from "next/server";
import {
  exchangePinterestCodeForToken,
  fetchPinterestDisplayName,
} from "@/lib/pinterest-oauth";
import {
  getPinterestEnvDebug,
  isPinterestConfigured,
} from "@/lib/pinterest-env";
import {
  PINTEREST_OAUTH_LOCALE_COOKIE,
  PINTEREST_OAUTH_STATE_COOKIE,
  redirectToAccountsAfterPinterest,
  resolveOAuthLocale,
} from "@/lib/pinterest-oauth-session";
import {
  mapSaveFailureToOAuthErrorKey,
  upsertConnectedAccount,
} from "@/lib/save-connected-account";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const locale = resolveOAuthLocale(
    request.cookies.get(PINTEREST_OAUTH_LOCALE_COOKIE)?.value,
  );
  const { searchParams } = request.nextUrl;

  const oauthError = searchParams.get("error");
  if (oauthError) {
    return redirectToAccountsAfterPinterest(request, locale, {
      error: "pinterest_denied",
    });
  }

  if (!isPinterestConfigured()) {
    const pinterestEnv = getPinterestEnvDebug();
    console.warn(
      "[posty/pinterest-oauth] Callback blocked — missing:",
      pinterestEnv.missing,
    );
    return redirectToAccountsAfterPinterest(request, locale, {
      error: "pinterest_not_configured",
    });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get(PINTEREST_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return redirectToAccountsAfterPinterest(request, locale, {
      error: "pinterest_invalid_state",
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
    response.cookies.delete(PINTEREST_OAUTH_STATE_COOKIE);
    response.cookies.delete(PINTEREST_OAUTH_LOCALE_COOKIE);
    return response;
  }

  try {
    const tokens = await exchangePinterestCodeForToken(code);
    const displayName =
      (await fetchPinterestDisplayName(tokens.accessToken)) ?? "Pinterest";

    const tokenExpiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
      : null;

    const saveResult = await upsertConnectedAccount({
      user_id: user.id,
      platform: "pinterest",
      account_name: displayName,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_expires_at: tokenExpiresAt,
      is_active: true,
    });

    if (!saveResult.ok) {
      return redirectToAccountsAfterPinterest(request, locale, {
        error: mapSaveFailureToOAuthErrorKey(saveResult.reason, "pinterest"),
      });
    }

    return redirectToAccountsAfterPinterest(request, locale, {
      connected: "pinterest",
    });
  } catch (error) {
    console.error("[posty/pinterest-oauth] Callback failed:", error);
    return redirectToAccountsAfterPinterest(request, locale, {
      error: "pinterest_token_failed",
    });
  }
}
