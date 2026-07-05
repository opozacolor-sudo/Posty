import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeGoogleBusinessCodeForTokens,
  fetchPrimaryGoogleBusinessLocation,
} from "@/lib/google-business-oauth";
import {
  getGoogleBusinessEnvDebug,
  isGoogleBusinessConfigured,
} from "@/lib/google-business-env";
import {
  GOOGLE_BUSINESS_OAUTH_LOCALE_COOKIE,
  GOOGLE_BUSINESS_OAUTH_STATE_COOKIE,
  redirectToAccountsAfterGoogleBusiness,
  resolveOAuthLocale,
} from "@/lib/google-business-oauth-session";
import {
  mapSaveFailureToOAuthErrorKey,
  upsertConnectedAccount,
} from "@/lib/save-connected-account";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const locale = resolveOAuthLocale(
    request.cookies.get(GOOGLE_BUSINESS_OAUTH_LOCALE_COOKIE)?.value,
  );
  const { searchParams } = request.nextUrl;

  const oauthError = searchParams.get("error");
  if (oauthError) {
    return redirectToAccountsAfterGoogleBusiness(request, locale, {
      error: "google_business_denied",
    });
  }

  if (!isGoogleBusinessConfigured()) {
    const env = getGoogleBusinessEnvDebug();
    console.warn(
      "[posty/google-business-oauth] Callback blocked — missing:",
      env.missing,
    );
    return redirectToAccountsAfterGoogleBusiness(request, locale, {
      error: "google_business_not_configured",
    });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get(GOOGLE_BUSINESS_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return redirectToAccountsAfterGoogleBusiness(request, locale, {
      error: "google_business_invalid_state",
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
    response.cookies.delete(GOOGLE_BUSINESS_OAUTH_STATE_COOKIE);
    response.cookies.delete(GOOGLE_BUSINESS_OAUTH_LOCALE_COOKIE);
    return response;
  }

  try {
    const tokens = await exchangeGoogleBusinessCodeForTokens(code);
    const locationResult = await fetchPrimaryGoogleBusinessLocation(tokens.accessToken);

    if (!locationResult.ok) {
      const errorByReason: Record<typeof locationResult.reason, string> = {
        no_account: "google_business_no_account",
        no_location: "google_business_no_location",
        api_disabled: "google_business_api_disabled",
        api_access_denied: "google_business_api_access",
        api_error: "google_business_api_error",
      };

      console.warn(
        "[posty/google-business-oauth] connect failed:",
        locationResult.reason,
        locationResult.detail ?? "",
      );

      return redirectToAccountsAfterGoogleBusiness(request, locale, {
        error: errorByReason[locationResult.reason],
      });
    }

    const location = locationResult.location;

    const tokenExpiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
      : null;

    const saveResult = await upsertConnectedAccount({
      user_id: user.id,
      platform: "google_business",
      account_name: location.displayLabel,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken ?? null,
      token_expires_at: tokenExpiresAt,
      is_active: true,
      platform_metadata: {
        gbp_location_name: location.locationName,
        gbp_account_name: location.accountName,
        gbp_location_title: location.title,
      },
    });

    if (!saveResult.ok) {
      return redirectToAccountsAfterGoogleBusiness(request, locale, {
        error: mapSaveFailureToOAuthErrorKey(saveResult.reason, "google_business"),
      });
    }

    return redirectToAccountsAfterGoogleBusiness(request, locale, {
      connected: "google_business",
    });
  } catch {
    return redirectToAccountsAfterGoogleBusiness(request, locale, {
      error: "google_business_token_failed",
    });
  }
}
