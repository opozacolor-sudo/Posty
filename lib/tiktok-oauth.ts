import { assertTikTokConfigured } from "./tiktok-env";

export const TIKTOK_OAUTH_SCOPES = ["user.info.basic"] as const;

export const TIKTOK_STATS_SCOPES = ["user.info.stats", "video.list"] as const;

export const TIKTOK_PUBLISH_SCOPES = ["video.publish"] as const;

export type TikTokOAuthScopeOptions = {
  publish?: boolean;
  stats?: boolean;
};

function envFlag(name: string): boolean {
  return process.env[name]?.trim().toLowerCase() === "true";
}

export function getTikTokOAuthScopes(
  options: TikTokOAuthScopeOptions = {},
): readonly string[] {
  const scopes: string[] = [...TIKTOK_OAUTH_SCOPES];

  if (options.publish) {
    scopes.push(...TIKTOK_PUBLISH_SCOPES);
  }

  if (options.stats) {
    scopes.push(...TIKTOK_STATS_SCOPES);
  }

  return scopes;
}

export function parseTikTokOAuthScopeParam(
  value: string | null | undefined,
): TikTokOAuthScopeOptions | "basic" | null {
  if (!value?.trim()) {
    return null;
  }

  if (value.trim().toLowerCase() === "basic") {
    return "basic";
  }

  const parts = value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  return {
    publish: parts.includes("publish"),
    stats: parts.includes("stats"),
  };
}

/** Default connect: basic (+ publish if enabled). Stats never auto-added — breaks OAuth if not approved in TikTok portal. */
export function resolveTikTokOAuthScopes(
  scopeParam: string | null | undefined,
): readonly string[] {
  const parsed = parseTikTokOAuthScopeParam(scopeParam);

  if (parsed === "basic") {
    return getTikTokOAuthScopes();
  }

  if (parsed) {
    return getTikTokOAuthScopes(parsed);
  }

  return getTikTokOAuthScopes({
    publish: envFlag("TIKTOK_INCLUDE_PUBLISH_SCOPES"),
    stats: false,
  });
}

export function buildTikTokConnectPath(
  locale: string,
  options?: TikTokOAuthScopeOptions | "basic",
): string {
  const params = new URLSearchParams({ locale });

  if (options === "basic") {
    params.set("scopes", "basic");
  } else if (options) {
    const scopes: string[] = [];
    if (options.publish) scopes.push("publish");
    if (options.stats) scopes.push("stats");
    if (scopes.length > 0) {
      params.set("scopes", scopes.join(","));
    }
  }

  return `/api/auth/tiktok?${params.toString()}`;
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
  scopes: readonly string[],
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

export async function refreshTikTokAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresIn?: number;
}> {
  const { clientKey, clientSecret } = assertTikTokConfigured();

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
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
    throw new Error(data.error_description ?? data.error ?? "Failed to refresh TikTok token");
  }

  const token = unwrapTokenResponse(data);

  if (!token.accessToken) {
    throw new Error("TikTok refresh response missing access_token");
  }

  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken ?? null,
    expiresIn: token.expiresIn,
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
