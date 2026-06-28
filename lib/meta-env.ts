export function getMetaEnv() {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  const redirectUri =
    process.env.META_REDIRECT_URI?.trim() ??
    "http://localhost:3000/api/auth/instagram/callback";

  return { appId, appSecret, redirectUri };
}

export function isMetaConfigured(): boolean {
  const { appId, appSecret } = getMetaEnv();
  return Boolean(appId && appSecret);
}

export function assertMetaConfigured(): {
  appId: string;
  appSecret: string;
  redirectUri: string;
} {
  const { appId, appSecret, redirectUri } = getMetaEnv();

  if (!appId || !appSecret) {
    throw new Error("META_NOT_CONFIGURED");
  }

  return { appId, appSecret, redirectUri };
}
