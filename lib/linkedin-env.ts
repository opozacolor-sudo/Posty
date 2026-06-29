export type LinkedInEnvDebug = {
  clientId: string | null;
  clientSecretPresent: boolean;
  redirectUri: string;
  configured: boolean;
  missing: string[];
};

export function getLinkedInEnv() {
  const clientId =
    process.env.LINKEDIN_CLIENT_ID?.trim() ?? process.env.LINKEDIN_APP_ID?.trim();
  const clientSecret =
    process.env.LINKEDIN_CLIENT_SECRET?.trim() ??
    process.env.LINKEDIN_APP_SECRET?.trim();
  const redirectUri =
    process.env.LINKEDIN_REDIRECT_URI?.trim() ??
    "http://localhost:3000/api/auth/linkedin/callback";

  return { clientId, clientSecret, redirectUri };
}

export function getLinkedInEnvDebug(): LinkedInEnvDebug {
  const { clientId, clientSecret, redirectUri } = getLinkedInEnv();
  const missing: string[] = [];

  if (!clientId) missing.push("LINKEDIN_CLIENT_ID");
  if (!clientSecret) missing.push("LINKEDIN_CLIENT_SECRET");

  return {
    clientId: clientId ?? null,
    clientSecretPresent: Boolean(clientSecret),
    redirectUri,
    configured: missing.length === 0,
    missing,
  };
}

export function isLinkedInConfigured(): boolean {
  return getLinkedInEnvDebug().configured;
}

export function assertLinkedInConfigured(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const { clientId, clientSecret, redirectUri } = getLinkedInEnv();

  if (!clientId || !clientSecret) {
    throw new Error("LINKEDIN_NOT_CONFIGURED");
  }

  return { clientId, clientSecret, redirectUri };
}
