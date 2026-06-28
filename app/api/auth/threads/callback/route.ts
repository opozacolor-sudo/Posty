import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeThreadsCodeForToken,
  exchangeThreadsForLongLivedToken,
  fetchThreadsUsername,
} from "@/lib/threads-oauth";
import { getThreadsEnvDebug, isThreadsConfigured } from "@/lib/threads-env";
import {
  THREADS_OAUTH_LOCALE_COOKIE,
  THREADS_OAUTH_STATE_COOKIE,
  redirectToAccountsAfterThreads,
  resolveOAuthLocale,
} from "@/lib/threads-oauth-session";
import {
  mapSaveFailureToOAuthErrorKey,
  upsertConnectedAccount,
} from "@/lib/save-connected-account";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const locale = resolveOAuthLocale(
    request.cookies.get(THREADS_OAUTH_LOCALE_COOKIE)?.value,
  );
  const { searchParams } = request.nextUrl;

  const oauthError = searchParams.get("error");
  if (oauthError) {
    return redirectToAccountsAfterThreads(request, locale, {
      error: "threads_denied",
    });
  }

  if (!isThreadsConfigured()) {
    const threadsEnv = getThreadsEnvDebug();
    console.warn(
      "[posty/threads-oauth] Callback blocked — missing:",
      threadsEnv.missing,
    );
    return redirectToAccountsAfterThreads(request, locale, {
      error: "threads_not_configured",
    });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get(THREADS_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return redirectToAccountsAfterThreads(request, locale, {
      error: "threads_invalid_state",
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
    response.cookies.delete(THREADS_OAUTH_STATE_COOKIE);
    response.cookies.delete(THREADS_OAUTH_LOCALE_COOKIE);
    return response;
  }

  try {
    const shortLived = await exchangeThreadsCodeForToken(code);
    const longLived = await exchangeThreadsForLongLivedToken(shortLived.accessToken);
    const username =
      (await fetchThreadsUsername(longLived.accessToken)) ?? shortLived.userId;

    const tokenExpiresAt = longLived.expiresIn
      ? new Date(Date.now() + longLived.expiresIn * 1000).toISOString()
      : null;

    const saveResult = await upsertConnectedAccount({
      user_id: user.id,
      platform: "threads",
      account_name: username,
      access_token: longLived.accessToken,
      refresh_token: null,
      token_expires_at: tokenExpiresAt,
      is_active: true,
    });

    if (!saveResult.ok) {
      return redirectToAccountsAfterThreads(request, locale, {
        error: mapSaveFailureToOAuthErrorKey(saveResult.reason, "threads"),
      });
    }

    return redirectToAccountsAfterThreads(request, locale, {
      connected: "threads",
    });
  } catch (error) {
    console.error("[posty/threads-oauth] Callback failed:", error);
    return redirectToAccountsAfterThreads(request, locale, {
      error: "threads_token_failed",
    });
  }
}
