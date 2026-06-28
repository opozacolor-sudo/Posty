import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchFacebookPage,
} from "@/lib/meta-oauth";
import { getMetaEnvDebug, isMetaConfigured, logMetaEnvAtStartup } from "@/lib/meta-env";
import {
  FACEBOOK_OAUTH_LOCALE_COOKIE,
  FACEBOOK_OAUTH_STATE_COOKIE,
  redirectToAccountsAfterFacebook,
  resolveOAuthLocale,
} from "@/lib/facebook-oauth-session";
import {
  mapSaveFailureToOAuthErrorKey,
  upsertConnectedAccount,
} from "@/lib/save-connected-account";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  logMetaEnvAtStartup();

  const locale = resolveOAuthLocale(
    request.cookies.get(FACEBOOK_OAUTH_LOCALE_COOKIE)?.value,
  );
  const { searchParams } = request.nextUrl;

  const oauthError = searchParams.get("error");
  if (oauthError) {
    return redirectToAccountsAfterFacebook(request, locale, {
      error: "facebook_denied",
    });
  }

  if (!isMetaConfigured()) {
    const metaEnv = getMetaEnvDebug();
    console.warn("[posty/facebook-oauth] Callback blocked — missing:", metaEnv.missing);
    return redirectToAccountsAfterFacebook(request, locale, {
      error: "facebook_not_configured",
    });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get(FACEBOOK_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return redirectToAccountsAfterFacebook(request, locale, {
      error: "facebook_invalid_state",
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
    response.cookies.delete(FACEBOOK_OAUTH_STATE_COOKIE);
    response.cookies.delete(FACEBOOK_OAUTH_LOCALE_COOKIE);
    return response;
  }

  try {
    const shortLived = await exchangeCodeForToken(code, "facebook");
    const longLivedUser = await exchangeForLongLivedToken(shortLived.accessToken);
    const facebookPage = await fetchFacebookPage(longLivedUser.accessToken);

    if (!facebookPage) {
      return redirectToAccountsAfterFacebook(request, locale, {
        error: "facebook_no_page",
      });
    }

    const expiresIn = facebookPage.expiresIn ?? longLivedUser.expiresIn;
    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const saveResult = await upsertConnectedAccount({
      user_id: user.id,
      platform: "facebook",
      account_name: facebookPage.accountName,
      access_token: facebookPage.accessToken,
      refresh_token: null,
      token_expires_at: tokenExpiresAt,
      is_active: true,
    });

    if (!saveResult.ok) {
      return redirectToAccountsAfterFacebook(request, locale, {
        error: mapSaveFailureToOAuthErrorKey(saveResult.reason, "facebook"),
      });
    }

    return redirectToAccountsAfterFacebook(request, locale, {
      connected: "facebook",
    });
  } catch (error) {
    console.error("[posty/facebook-oauth] Callback failed:", error);
    return redirectToAccountsAfterFacebook(request, locale, {
      error: "facebook_token_failed",
    });
  }
}
