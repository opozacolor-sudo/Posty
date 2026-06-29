import { getHiggsfieldClientConfig } from "./higgsfield-intent";

export type HiggsfieldEnvDebug = {
  configured: boolean;
  missing: string[];
  credentialSource: "hf_credentials" | "hf_key_secret" | "cli" | "none";
  cliEnabled?: boolean;
  cliAvailable?: boolean;
};

export function getHiggsfieldCredentials(): string | null {
  const creds = getHiggsfieldClientConfig();
  if (!creds) {
    return null;
  }

  return `${creds.apiKey}:${creds.apiSecret}`;
}

export function isHiggsfieldCliEnabled(): boolean {
  if (process.env.HIGGSFIELD_USE_CLI === "false") {
    return false;
  }

  if (process.env.HIGGSFIELD_USE_CLI === "true") {
    return true;
  }

  return !process.env.VERCEL;
}

export function isHiggsfieldSdkConfigured(): boolean {
  return getHiggsfieldCredentials() !== null;
}

export function isHiggsfieldConfigured(): boolean {
  if (isHiggsfieldSdkConfigured()) {
    return true;
  }

  return isHiggsfieldCliEnabled();
}

/** Image generation in chat/API — SDK on Vercel, SDK or CLI locally. */
export function isHiggsfieldGenerationAvailable(): boolean {
  if (isHiggsfieldSdkConfigured()) {
    return true;
  }

  if (process.env.VERCEL) {
    return false;
  }

  return isHiggsfieldCliEnabled();
}

export function isVercelDeployment(): boolean {
  return Boolean(process.env.VERCEL);
}

export async function getHiggsfieldEnvDebugAsync(): Promise<HiggsfieldEnvDebug> {
  const sdkConfigured = isHiggsfieldSdkConfigured();
  const cliEnabled = isHiggsfieldCliEnabled();
  const { isHiggsfieldCliAvailable } = await import("./higgsfield-cli");
  const cliAvailable = cliEnabled ? await isHiggsfieldCliAvailable() : false;

  if (sdkConfigured) {
    return getHiggsfieldEnvDebug();
  }

  if (cliEnabled && cliAvailable) {
    return {
      configured: true,
      missing: [],
      credentialSource: "cli",
      cliEnabled: true,
      cliAvailable: true,
    };
  }

  const debug = getHiggsfieldEnvDebug();
  return {
    ...debug,
    cliEnabled,
    cliAvailable,
    configured: debug.configured || (cliEnabled && cliAvailable),
    credentialSource:
      cliEnabled && cliAvailable ? "cli" : debug.credentialSource,
    missing:
      cliEnabled && !cliAvailable
        ? [...debug.missing, "higgsfield CLI (run: higgsfield auth login)"]
        : debug.missing,
  };
}

export function getHiggsfieldEnvDebug(): HiggsfieldEnvDebug {
  const missing: string[] = [];

  if (process.env.HF_CREDENTIALS?.trim()) {
    return {
      configured: Boolean(getHiggsfieldCredentials()),
      missing: getHiggsfieldCredentials() ? [] : ["HF_CREDENTIALS (invalid format, use KEY_ID:KEY_SECRET)"],
      credentialSource: "hf_credentials",
    };
  }

  if (process.env.HF_API_KEY?.trim() || process.env.HF_API_SECRET?.trim()) {
    if (!process.env.HF_API_KEY?.trim()) missing.push("HF_API_KEY");
    if (!process.env.HF_API_SECRET?.trim()) missing.push("HF_API_SECRET");
    return {
      configured: missing.length === 0,
      missing,
      credentialSource: "hf_key_secret",
    };
  }

  if (process.env.HIGGSFIELD_API_KEY?.trim()) {
    return {
      configured: Boolean(getHiggsfieldCredentials()),
      missing: getHiggsfieldCredentials() ? [] : ["HIGGSFIELD_API_KEY (use KEY_ID:KEY_SECRET format)"],
      credentialSource: "hf_credentials",
    };
  }

  if (isHiggsfieldCliEnabled()) {
    missing.push("higgsfield CLI (local: higgsfield auth login)");
  } else if (process.env.VERCEL) {
    missing.push("HF_CREDENTIALS (from https://cloud.higgsfield.ai/api-keys)");
  } else {
    missing.push("HF_CREDENTIALS or HF_API_KEY+HF_API_SECRET");
  }

  return {
    configured: false,
    missing,
    credentialSource: "none",
    cliEnabled: isHiggsfieldCliEnabled(),
  };
}
