import { assertInstagramConfigured } from "./instagram-env";

export const INSTAGRAM_BUSINESS_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
] as const;

type ShortLivedTokenResponse = {
  access_token?: string;
  user_id?: string | number;
  error_type?: string;
  error_message?: string;
};

type LongLivedTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message: string };
};

type InstagramProfileResponse = {
  username?: string;
  name?: string;
  user_id?: string;
  error?: { message: string };
};

export function buildInstagramBusinessLoginUrl(state: string): string {
  const { appId, redirectUri } = assertInstagramConfigured();

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: INSTAGRAM_BUSINESS_SCOPES.join(","),
    state,
  });

  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeInstagramCodeForToken(code: string): Promise<{
  accessToken: string;
  userId: string;
}> {
  const { appId, appSecret, redirectUri } = assertInstagramConfigured();

  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await response.json()) as ShortLivedTokenResponse;

  if (!response.ok || !data.access_token || !data.user_id) {
    throw new Error(data.error_message ?? "Failed to exchange Instagram OAuth code");
  }

  return {
    accessToken: data.access_token,
    userId: String(data.user_id),
  };
}

export async function exchangeInstagramForLongLivedToken(
  shortLivedToken: string,
): Promise<{ accessToken: string; expiresIn?: number }> {
  const { appSecret } = assertInstagramConfigured();

  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: appSecret,
    access_token: shortLivedToken,
  });

  const response = await fetch(
    `https://graph.instagram.com/access_token?${params.toString()}`,
  );

  const data = (await response.json()) as LongLivedTokenResponse;

  if (!response.ok || !data.access_token) {
    return { accessToken: shortLivedToken, expiresIn: undefined };
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function fetchInstagramUsername(
  accessToken: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    fields: "username,name,user_id",
    access_token: accessToken,
  });

  const response = await fetch(`https://graph.instagram.com/me?${params.toString()}`);
  const data = (await response.json()) as InstagramProfileResponse;

  if (!response.ok) {
    return null;
  }

  return data.username ?? data.name ?? data.user_id ?? null;
}
