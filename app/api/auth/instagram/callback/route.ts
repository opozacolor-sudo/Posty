import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchInstagramAccount,
} from "@/lib/meta-oauth";
import { isMetaConfigured, logMetaEnvAtStartup, getMetaEnvDebug } from "@/lib/meta-env";
import {
  INSTAGRAM_OAUTH_LOCALE_COOKIE,
  INSTAGRAM_OAUTH_STATE_COOKIE,
  redirectToAccounts,
  resolveOAuthLocale,
} from "@/lib/instagram-oauth-session";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  logMetaEnvAtStartup();

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

  if (!isMetaConfigured()) {
    const metaEnv = getMetaEnvDebug();
    console.warn("[posty/instagram-oauth] Callback blocked — missing:", metaEnv.missing);
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
    const shortLived = await exchangeCodeForToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.accessToken);
    const instagramAccount = await fetchInstagramAccount(longLived.accessToken);

    if (!instagramAccount) {
      return redirectToAccounts(request, locale, {
        error: "instagram_no_business_account",
      });
    }

    const expiresIn = longLived.expiresIn ?? shortLived.expiresIn;
    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    const { error: upsertError } = await supabase.from("connected_accounts").upsert(
      {
        user_id: user.id,
        platform: "instagram",
        account_name: instagramAccount.accountName,
        access_token: longLived.accessToken,
        refresh_token: null,
        token_expires_at: tokenExpiresAt,
        is_active: true,
      },
      { onConflict: "user_id,platform" },
    );

    if (upsertError) {
      return redirectToAccounts(request, locale, {
        error: "instagram_save_failed",
      });
    }

    return redirectToAccounts(request, locale, {
      connected: "instagram",
    });
  } catch {
    return redirectToAccounts(request, locale, {
      error: "instagram_token_failed",
    });
  }
}
