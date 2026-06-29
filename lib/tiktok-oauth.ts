import { assertTikTokConfigured } from "./tiktok-env";

export const TIKTOK_OAUTH_SCOPES = ["user.info.basic"] as const;

export const TIKTOK_STATS_SCOPES = ["user.info.stats", "video.list"] as const;

export function getTikTokOAuthScopes(): readonly string[] {
  const includeStats =
    process.env.TIKTOK_INCLUDE_STATS_SCOPES?.trim().toLowerCase() === "true";

  if (includeStats) {
    return [...TIKTOK_OAUTH_SCOPES, ...TIKTOK_STATS_SCOPES];
  }

  return TIKTOK_OAUTH_SCOPES;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  open_id?: string;
  error?: string;
  error_description?: string;
  data?: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    open_id?: string;
  };
};

type UserInfoResponse = {
  data?: {
    user?: {
      open_id?: string;
      display_name?: string;
      username?: string;
    };
  };
  error?: { message?: string; code?: string };
};

function unwrapTokenResponse(data: TokenResponse) {
  return {
    accessToken: data.data?.access_token ?? data.access_token,
    refreshToken: data.data?.refresh_token ?? data.refresh_token,
    expiresIn: data.data?.expires_in ?? data.expires_in,
    openId: data.data?.open_id ?? data.open_id,
  };
}

export function buildTikTokOAuthUrl(
  state: string,
  scopes: readonly string[] = getTikTokOAuthScopes(),
): string {
  const { clientKey, redirectUri } = assertTikTokConfigured();

  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope: scopes.join(","),
    redirect_uri: redirectUri,
    state,
  });

  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

export async function exchangeTikTokCodeForToken(code: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresIn?: number;
  openId: string | null;
}> {
  const { clientKey, clientSecret, redirectUri } = assertTikTokConfigured();

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body,
  });

  const data = (await response.json()) as TokenResponse;

  if (!response.ok) {
    throw new Error(data.error_description ?? data.error ?? "Failed to exchange TikTok OAuth code");
  }

  const token = unwrapTokenResponse(data);

  if (!token.accessToken) {
    throw new Error("TikTok token response missing access_token");
  }

  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken ?? null,
    expiresIn: token.expiresIn,
    openId: token.openId ?? null,
  };
}

export async function fetchTikTokDisplayName(accessToken: string): Promise<string | null> {
  const params = new URLSearchParams({
    fields: "open_id,display_name,username",
  });

  const response = await fetch(
    `https://open.tiktokapis.com/v2/user/info/?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = (await response.json()) as UserInfoResponse;

  if (!response.ok || !data.data?.user) {
    return null;
  }

  const user = data.data.user;
  return user.username ?? user.display_name ?? user.open_id ?? null;
}
