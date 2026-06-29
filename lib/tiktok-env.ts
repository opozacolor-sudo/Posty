export type TikTokEnvDebug = {
  clientKey: string | null;
  clientSecretPresent: boolean;
  redirectUri: string;
  configured: boolean;
  missing: string[];
};

export function getTikTokEnv() {
  const clientKey =
    process.env.TIKTOK_CLIENT_KEY?.trim() ?? process.env.TIKTOK_APP_ID?.trim();
  const clientSecret =
    process.env.TIKTOK_CLIENT_SECRET?.trim() ?? process.env.TIKTOK_APP_SECRET?.trim();
  const redirectUri =
    process.env.TIKTOK_REDIRECT_URI?.trim() ??
    "http://localhost:3000/api/auth/tiktok/callback";

  return { clientKey, clientSecret, redirectUri };
}

export function getTikTokEnvDebug(): TikTokEnvDebug {
  const { clientKey, clientSecret, redirectUri } = getTikTokEnv();
  const missing: string[] = [];

  if (!clientKey) missing.push("TIKTOK_CLIENT_KEY");
  if (!clientSecret) missing.push("TIKTOK_CLIENT_SECRET");

  if (
    redirectUri &&
    !redirectUri.endsWith("/api/auth/tiktok/callback")
  ) {
    missing.push("TIKTOK_REDIRECT_URI must end with /api/auth/tiktok/callback");
  }

  return {
    clientKey: clientKey ?? null,
    clientSecretPresent: Boolean(clientSecret),
    redirectUri,
    configured: missing.length === 0,
    missing,
  };
}

export function isTikTokConfigured(): boolean {
  return getTikTokEnvDebug().configured;
}

export function assertTikTokConfigured(): {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
} {
  const { clientKey, clientSecret, redirectUri } = getTikTokEnv();

  if (!clientKey || !clientSecret) {
    throw new Error("TIKTOK_NOT_CONFIGURED");
  }

  return { clientKey, clientSecret, redirectUri };
}
