import { assertLinkedInConfigured, getLinkedInOAuthScopes } from "./linkedin-env";

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

type UserInfoResponse = {
  sub?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
};

export function buildLinkedInOAuthUrl(state: string): string {
  const { clientId, redirectUri } = assertLinkedInConfigured();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: getLinkedInOAuthScopes().join(" "),
  });

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

export async function exchangeLinkedInCodeForToken(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresIn?: number;
}> {
  const { clientId, clientSecret, redirectUri } = assertLinkedInConfigured();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = (await response.json()) as TokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? "Failed to exchange LinkedIn OAuth code",
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in,
  };
}

export async function fetchLinkedInDisplayName(accessToken: string): Promise<string | null> {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = (await response.json()) as UserInfoResponse;

  if (!response.ok) {
    return null;
  }

  if (data.name) {
    return data.name;
  }

  const parts = [data.given_name, data.family_name].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" ");
  }

  return data.email ?? data.sub ?? null;
}
