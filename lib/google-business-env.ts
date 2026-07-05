import { assertGoogleConfigured, getGoogleEnvDebug, isGoogleConfigured } from "./google-env";

export type GoogleBusinessEnvDebug = {
  clientId: string | null;
  clientSecretPresent: boolean;
  redirectUri: string;
  configured: boolean;
  missing: string[];
};

export function getGoogleBusinessEnv() {
  const redirectUri =
    process.env.GOOGLE_BUSINESS_REDIRECT_URI?.trim() ??
    "http://localhost:3000/api/auth/google-business/callback";

  return { redirectUri };
}

export function getGoogleBusinessEnvDebug(): GoogleBusinessEnvDebug {
  const google = getGoogleEnvDebug();
  const { redirectUri } = getGoogleBusinessEnv();
  const missing = [...google.missing];

  if (
    redirectUri &&
    !redirectUri.endsWith("/api/auth/google-business/callback")
  ) {
    missing.push(
      "GOOGLE_BUSINESS_REDIRECT_URI must end with /api/auth/google-business/callback",
    );
  }

  return {
    clientId: google.clientId,
    clientSecretPresent: google.clientSecretPresent,
    redirectUri,
    configured: isGoogleConfigured() && missing.length === google.missing.length,
    missing,
  };
}

export function isGoogleBusinessConfigured(): boolean {
  return getGoogleBusinessEnvDebug().configured;
}

export function assertGoogleBusinessConfigured(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const debug = getGoogleBusinessEnvDebug();

  if (!debug.configured || !debug.clientId) {
    throw new Error("GOOGLE_BUSINESS_NOT_CONFIGURED");
  }

  const { clientId, clientSecret } = assertGoogleConfigured();

  return {
    clientId,
    clientSecret,
    redirectUri: debug.redirectUri,
  };
}
