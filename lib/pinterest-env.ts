export type PinterestEnvDebug = {
  appId: string | null;
  appSecretPresent: boolean;
  redirectUri: string;
  scopes: string[];
  configured: boolean;
  missing: string[];
};

/** Minimum scope to identify the connected Pinterest account. */
export const PINTEREST_CONNECT_SCOPES = ["user_accounts:read"] as const;

/** Scopes needed later for scheduling pins. */
export const PINTEREST_WRITE_SCOPES = [
  "boards:read",
  "boards:write",
  "pins:read",
  "pins:write",
] as const;

function parseScopeList(value: string | undefined): string[] {
  if (!value?.trim()) return [];

  return value
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

export function getPinterestOAuthScopes(): string[] {
  const override = process.env.PINTEREST_OAUTH_SCOPES?.trim();
  if (override) {
    return parseScopeList(override);
  }

  const scopes: string[] = [...PINTEREST_CONNECT_SCOPES];
  const extra = parseScopeList(process.env.PINTEREST_EXTRA_SCOPES);

  for (const scope of extra) {
    if (!scopes.includes(scope)) {
      scopes.push(scope);
    }
  }

  const includeWrite =
    process.env.PINTEREST_INCLUDE_WRITE_SCOPES?.trim().toLowerCase() === "true";
  if (includeWrite) {
    for (const scope of PINTEREST_WRITE_SCOPES) {
      if (!scopes.includes(scope)) {
        scopes.push(scope);
      }
    }
  }

  return scopes;
}

export function getPinterestEnv() {
  const appId =
    process.env.PINTEREST_APP_ID?.trim() ??
    process.env.PINTEREST_CLIENT_ID?.trim();
  const appSecret =
    process.env.PINTEREST_APP_SECRET?.trim() ??
    process.env.PINTEREST_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.PINTEREST_REDIRECT_URI?.trim() ??
    "http://localhost:3000/api/auth/pinterest/callback";

  return { appId, appSecret, redirectUri };
}

export function getPinterestEnvDebug(): PinterestEnvDebug {
  const { appId, appSecret, redirectUri } = getPinterestEnv();
  const missing: string[] = [];

  if (!appId) missing.push("PINTEREST_APP_ID");
  if (!appSecret) missing.push("PINTEREST_APP_SECRET");

  return {
    appId: appId ?? null,
    appSecretPresent: Boolean(appSecret),
    redirectUri,
    scopes: getPinterestOAuthScopes(),
    configured: missing.length === 0,
    missing,
  };
}

export function isPinterestConfigured(): boolean {
  return getPinterestEnvDebug().configured;
}

export function assertPinterestConfigured(): {
  appId: string;
  appSecret: string;
  redirectUri: string;
} {
  const { appId, appSecret, redirectUri } = getPinterestEnv();

  if (!appId || !appSecret) {
    throw new Error("PINTEREST_NOT_CONFIGURED");
  }

  return { appId, appSecret, redirectUri };
}
