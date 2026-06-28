import { assertThreadsConfigured } from "./threads-env";

export const THREADS_OAUTH_SCOPES = [
  "threads_basic",
  "threads_content_publish",
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

type ThreadsProfileResponse = {
  username?: string;
  name?: string;
  id?: string;
  error?: { message: string };
};

export function buildThreadsOAuthUrl(state: string): string {
  const { appId, redirectUri } = assertThreadsConfigured();

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: THREADS_OAUTH_SCOPES.join(","),
    state,
  });

  return `https://threads.net/oauth/authorize?${params.toString()}`;
}

export async function exchangeThreadsCodeForToken(code: string): Promise<{
  accessToken: string;
  userId: string;
}> {
  const { appId, appSecret, redirectUri } = assertThreadsConfigured();

  const body = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch("https://graph.threads.net/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await response.json()) as ShortLivedTokenResponse;

  if (!response.ok || !data.access_token || data.user_id == null) {
    throw new Error(data.error_message ?? "Failed to exchange Threads OAuth code");
  }

  return {
    accessToken: data.access_token,
    userId: String(data.user_id),
  };
}

export async function exchangeThreadsForLongLivedToken(
  shortLivedToken: string,
): Promise<{ accessToken: string; expiresIn?: number }> {
  const { appSecret } = assertThreadsConfigured();

  const params = new URLSearchParams({
    grant_type: "th_exchange_token",
    client_secret: appSecret,
    access_token: shortLivedToken,
  });

  const response = await fetch(
    `https://graph.threads.net/access_token?${params.toString()}`,
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

export async function fetchThreadsUsername(accessToken: string): Promise<string | null> {
  const params = new URLSearchParams({
    fields: "username,name,id",
    access_token: accessToken,
  });

  const response = await fetch(`https://graph.threads.net/me?${params.toString()}`);
  const data = (await response.json()) as ThreadsProfileResponse;

  if (!response.ok) {
    return null;
  }

  return data.username ?? data.name ?? data.id ?? null;
}
