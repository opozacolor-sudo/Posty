export type ThreadsEnvDebug = {
  appId: string | null;
  appSecretPresent: boolean;
  redirectUri: string;
  configured: boolean;
  missing: string[];
};

export function getThreadsEnv() {
  const appId =
    process.env.THREADS_APP_ID?.trim() ??
    process.env.META_THREADS_APP_ID?.trim();
  const appSecret =
    process.env.THREADS_APP_SECRET?.trim() ??
    process.env.META_THREADS_APP_SECRET?.trim();
  const redirectUri =
    process.env.THREADS_REDIRECT_URI?.trim() ??
    "http://localhost:3000/api/auth/threads/callback";

  return { appId, appSecret, redirectUri };
}

export function getThreadsEnvDebug(): ThreadsEnvDebug {
  const { appId, appSecret, redirectUri } = getThreadsEnv();
  const missing: string[] = [];

  if (!appId) missing.push("THREADS_APP_ID");
  if (!appSecret) missing.push("THREADS_APP_SECRET");

  return {
    appId: appId ?? null,
    appSecretPresent: Boolean(appSecret),
    redirectUri,
    configured: missing.length === 0,
    missing,
  };
}

export function isThreadsConfigured(): boolean {
  return getThreadsEnvDebug().configured;
}

export function assertThreadsConfigured(): {
  appId: string;
  appSecret: string;
  redirectUri: string;
} {
  const { appId, appSecret, redirectUri } = getThreadsEnv();

  if (!appId || !appSecret) {
    throw new Error("THREADS_NOT_CONFIGURED");
  }

  return { appId, appSecret, redirectUri };
}
