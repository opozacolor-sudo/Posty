export type GoogleEnvDebug = {
  clientId: string | null;
  clientSecretPresent: boolean;
  clientSecretPreview: string | null;
  redirectUri: string;
  configured: boolean;
  missing: string[];
};

function maskSecret(secret: string | undefined): string | null {
  if (!secret) return null;
  if (secret.length <= 8) return "****";
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

export function getGoogleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ??
    "http://localhost:3000/api/auth/youtube/callback";

  return { clientId, clientSecret, redirectUri };
}

export function getGoogleEnvDebug(): GoogleEnvDebug {
  const { clientId, clientSecret, redirectUri } = getGoogleEnv();
  const missing: string[] = [];

  if (!clientId) missing.push("GOOGLE_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");

  return {
    clientId: clientId ?? null,
    clientSecretPresent: Boolean(clientSecret),
    clientSecretPreview: maskSecret(clientSecret),
    redirectUri,
    configured: missing.length === 0,
    missing,
  };
}

export function isGoogleConfigured(): boolean {
  return getGoogleEnvDebug().configured;
}

export function assertGoogleConfigured(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const { clientId, clientSecret, redirectUri } = getGoogleEnv();

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_NOT_CONFIGURED");
  }

  return { clientId, clientSecret, redirectUri };
}
