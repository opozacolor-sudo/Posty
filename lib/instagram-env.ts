export type InstagramEnvDebug = {
  appId: string | null;
  appSecretPresent: boolean;
  redirectUri: string;
  configured: boolean;
  missing: string[];
};

export function getInstagramEnv() {
  const appId =
    process.env.INSTAGRAM_APP_ID?.trim() ??
    process.env.META_INSTAGRAM_APP_ID?.trim();
  const appSecret =
    process.env.INSTAGRAM_APP_SECRET?.trim() ??
    process.env.META_INSTAGRAM_APP_SECRET?.trim();
  const redirectUri =
    process.env.INSTAGRAM_REDIRECT_URI?.trim() ??
    process.env.META_REDIRECT_URI?.trim() ??
    "http://localhost:3000/api/auth/instagram/callback";

  return { appId, appSecret, redirectUri };
}

export function getInstagramEnvDebug(): InstagramEnvDebug {
  const { appId, appSecret, redirectUri } = getInstagramEnv();
  const missing: string[] = [];

  if (!appId) missing.push("INSTAGRAM_APP_ID");
  if (!appSecret) missing.push("INSTAGRAM_APP_SECRET");

  return {
    appId: appId ?? null,
    appSecretPresent: Boolean(appSecret),
    redirectUri,
    configured: missing.length === 0,
    missing,
  };
}

export function isInstagramConfigured(): boolean {
  return getInstagramEnvDebug().configured;
}

export function assertInstagramConfigured(): {
  appId: string;
  appSecret: string;
  redirectUri: string;
} {
  const { appId, appSecret, redirectUri } = getInstagramEnv();

  if (!appId || !appSecret) {
    throw new Error("INSTAGRAM_NOT_CONFIGURED");
  }

  return { appId, appSecret, redirectUri };
}
