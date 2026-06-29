import {
  assertPinterestConfigured,
  getPinterestOAuthScopes,
} from "./pinterest-env";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  scope?: string;
  error?: string;
  message?: string;
};

type UserAccountResponse = {
  username?: string;
  profile_name?: string;
  business_name?: string;
  id?: string;
};

function buildBasicAuthHeader(appId: string, appSecret: string): string {
  return `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`;
}

export function buildPinterestOAuthUrl(state: string): string {
  const { appId, redirectUri } = assertPinterestConfigured();

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: getPinterestOAuthScopes().join(","),
    state,
  });

  return `https://www.pinterest.com/oauth/?${params.toString()}`;
}

export async function exchangePinterestCodeForToken(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresIn?: number;
}> {
  const { appId, appSecret, redirectUri } = assertPinterestConfigured();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      Authorization: buildBasicAuthHeader(appId, appSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = (await response.json()) as TokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.message ?? data.error ?? "Failed to exchange Pinterest OAuth code");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in,
  };
}

export async function fetchPinterestDisplayName(
  accessToken: string,
): Promise<string | null> {
  const response = await fetch("https://api.pinterest.com/v5/user_account", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = (await response.json()) as UserAccountResponse;

  if (!response.ok) {
    return null;
  }

  return (
    data.username ??
    data.profile_name ??
    data.business_name ??
    data.id ??
    null
  );
}
