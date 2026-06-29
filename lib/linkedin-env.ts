export type LinkedInEnvDebug = {
  clientId: string | null;
  clientSecretPresent: boolean;
  redirectUri: string;
  scopes: string[];
  configured: boolean;
  missing: string[];
};

/** Connect-only scopes — work with "Sign In with LinkedIn using OpenID Connect". */
export const LINKEDIN_CONNECT_SCOPES = ["openid", "profile", "email"] as const;

/** Requires "Share on LinkedIn" product in the developer portal. */
export const LINKEDIN_POST_SCOPE = "w_member_social";

function parseScopeList(value: string | undefined): string[] {
  if (!value?.trim()) return [];

  return value
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export function getLinkedInOAuthScopes(): string[] {
  const override = process.env.LINKEDIN_OAUTH_SCOPES?.trim();
  if (override) {
    return parseScopeList(override);
  }

  const scopes: string[] = [...LINKEDIN_CONNECT_SCOPES];
  const extra = parseScopeList(process.env.LINKEDIN_EXTRA_SCOPES);

  for (const scope of extra) {
    if (!scopes.includes(scope)) {
      scopes.push(scope);
    }
  }

  const includePost =
    process.env.LINKEDIN_INCLUDE_POST_SCOPE?.trim().toLowerCase() === "true";
  if (includePost && !scopes.includes(LINKEDIN_POST_SCOPE)) {
    scopes.push(LINKEDIN_POST_SCOPE);
  }

  return scopes;
}

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
    scopes: getLinkedInOAuthScopes(),
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
