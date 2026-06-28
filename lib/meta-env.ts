export type MetaEnvDebug = {
  appId: string | null;
  appSecretPresent: boolean;
  appSecretPreview: string | null;
  instagramRedirectUri: string;
  facebookRedirectUri: string;
  configured: boolean;
  missing: string[];
};

function maskSecret(secret: string | undefined): string | null {
  if (!secret) return null;
  if (secret.length <= 8) return "****";
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

export function getMetaEnv() {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  const instagramRedirectUri =
    process.env.META_REDIRECT_URI?.trim() ??
    "http://localhost:3000/api/auth/instagram/callback";
  const facebookRedirectUri =
    process.env.META_FACEBOOK_REDIRECT_URI?.trim() ??
    instagramRedirectUri.replace(
      "/api/auth/instagram/callback",
      "/api/auth/facebook/callback",
    );

  return { appId, appSecret, instagramRedirectUri, facebookRedirectUri };
}

export function getMetaEnvDebug(): MetaEnvDebug {
  const { appId, appSecret, instagramRedirectUri, facebookRedirectUri } =
    getMetaEnv();
  const missing: string[] = [];

  if (!appId) missing.push("META_APP_ID");
  if (!appSecret) missing.push("META_APP_SECRET");

  return {
    appId: appId ?? null,
    appSecretPresent: Boolean(appSecret),
    appSecretPreview: maskSecret(appSecret),
    instagramRedirectUri,
    facebookRedirectUri,
    configured: missing.length === 0,
    missing,
  };
}

let startupLogged = false;

export function logMetaEnvAtStartup(force = false) {
  if (startupLogged && !force) return;

  startupLogged = true;
  const debug = getMetaEnvDebug();

  console.log("[posty/meta-oauth] Meta env at startup:", {
    META_APP_ID: debug.appId,
    META_APP_SECRET: debug.appSecretPreview,
    META_APP_SECRET_present: debug.appSecretPresent,
    META_REDIRECT_URI: debug.instagramRedirectUri,
    META_FACEBOOK_REDIRECT_URI: debug.facebookRedirectUri,
    configured: debug.configured,
    missing: debug.missing,
  });

  if (!debug.configured) {
    console.warn(
      "[posty/meta-oauth] Instagram OAuth disabled — add missing vars to .env.local and restart `npm run dev`.",
    );
  }
}

export function isMetaConfigured(): boolean {
  return getMetaEnvDebug().configured;
}

export function assertMetaConfigured(
  platform: "instagram" | "facebook" = "instagram",
): {
  appId: string;
  appSecret: string;
  redirectUri: string;
} {
  const { appId, appSecret, instagramRedirectUri, facebookRedirectUri } =
    getMetaEnv();

  if (!appId || !appSecret) {
    throw new Error("META_NOT_CONFIGURED");
  }

  return {
    appId,
    appSecret,
    redirectUri:
      platform === "facebook" ? facebookRedirectUri : instagramRedirectUri,
  };
}
