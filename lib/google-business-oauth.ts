import {
  exchangeGoogleCodeForTokens,
  refreshGoogleAccessToken,
} from "./google-oauth";
import { assertGoogleBusinessConfigured } from "./google-business-env";

export const GOOGLE_BUSINESS_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
] as const;

export type GoogleBusinessLocation = {
  locationName: string;
  accountName: string;
  title: string;
  displayLabel: string;
};

export type FetchGoogleBusinessLocationResult =
  | { ok: true; location: GoogleBusinessLocation }
  | {
      ok: false;
      reason:
        | "no_account"
        | "no_location"
        | "api_disabled"
        | "api_access_denied"
        | "api_error";
      detail?: string;
    };

function classifyGoogleBusinessApiError(
  message: string,
  status: number,
):
  | "api_disabled"
  | "api_access_denied"
  | "api_error" {
  const lower = message.toLowerCase();

  if (
    lower.includes("has not been used") ||
    lower.includes("is disabled") ||
    lower.includes("not enabled")
  ) {
    return "api_disabled";
  }

  if (
    status === 403 ||
    lower.includes("quota") ||
    lower.includes("permission") ||
    lower.includes("access not configured")
  ) {
    return "api_access_denied";
  }

  return "api_error";
}

export function buildGoogleBusinessOAuthUrl(state: string): string {
  const { clientId, redirectUri } = assertGoogleBusinessConfigured();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_BUSINESS_OAUTH_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleBusinessCodeForTokens(code: string) {
  const { redirectUri } = assertGoogleBusinessConfigured();
  return exchangeGoogleCodeForTokens(code, redirectUri);
}

export { refreshGoogleAccessToken };

type GbpAccountsResponse = {
  accounts?: Array<{
    name?: string;
    accountName?: string;
  }>;
  error?: { message?: string; status?: string };
};

type GbpLocationsResponse = {
  locations?: Array<{
    name?: string;
    title?: string;
    storefrontAddress?: {
      locality?: string;
      administrativeArea?: string;
    };
  }>;
  error?: { message?: string; status?: string };
};

function formatLocationLabel(
  title: string,
  address?: { locality?: string; administrativeArea?: string },
): string {
  const city = address?.locality?.trim();
  const region = address?.administrativeArea?.trim();
  const place = city || region;

  return place ? `${title} (${place})` : title;
}

export async function fetchPrimaryGoogleBusinessLocation(
  accessToken: string,
): Promise<FetchGoogleBusinessLocationResult> {
  const accountsResponse = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  const accountsData = (await accountsResponse.json()) as GbpAccountsResponse;

  if (!accountsResponse.ok) {
    const detail = accountsData.error?.message ?? `HTTP ${accountsResponse.status}`;
    console.error("[posty/google-business] list accounts failed:", detail);

    return {
      ok: false,
      reason: classifyGoogleBusinessApiError(detail, accountsResponse.status),
      detail,
    };
  }

  const account = accountsData.accounts?.find((item) => item.name);
  if (!account?.name) {
    return { ok: false, reason: "no_account" };
  }

  const accountId = account.name.replace(/^accounts\//, "");
  const locationsUrl =
    `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations` +
    "?" +
    new URLSearchParams({
      readMask: "name,title,storefrontAddress",
      pageSize: "20",
    });

  const locationsResponse = await fetch(locationsUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const locationsData = (await locationsResponse.json()) as GbpLocationsResponse;

  if (!locationsResponse.ok) {
    const detail = locationsData.error?.message ?? `HTTP ${locationsResponse.status}`;
    console.error("[posty/google-business] list locations failed:", detail);

    return {
      ok: false,
      reason: classifyGoogleBusinessApiError(detail, locationsResponse.status),
      detail,
    };
  }

  const location = locationsData.locations?.find((item) => item.name);
  if (!location?.name) {
    return { ok: false, reason: "no_location" };
  }

  const locationName = location.name.startsWith("accounts/")
    ? location.name
    : `${account.name}/${location.name.replace(/^\//, "")}`;

  const title =
    location.title?.trim() ||
    account.accountName?.trim() ||
    "Google Business location";

  return {
    ok: true,
    location: {
      locationName,
      accountName: account.name,
      title,
      displayLabel: formatLocationLabel(title, location.storefrontAddress),
    },
  };
}

export function buildGoogleBusinessLocationParent(locationName: string): string {
  return locationName.startsWith("accounts/")
    ? locationName
    : `accounts/${locationName}`;
}
