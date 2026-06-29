export type HiggsfieldEnvDebug = {
  configured: boolean;
  missing: string[];
  credentialSource: "hf_credentials" | "hf_key_secret" | "none";
};

export function getHiggsfieldCredentials(): string | null {
  const combined = process.env.HF_CREDENTIALS?.trim();
  if (combined && combined.includes(":")) {
    return combined;
  }

  const apiKey = process.env.HF_API_KEY?.trim();
  const apiSecret = process.env.HF_API_SECRET?.trim();
  if (apiKey && apiSecret) {
    return `${apiKey}:${apiSecret}`;
  }

  // CLI-style single key (if user already set this from higgsfield auth docs)
  const cliKey = process.env.HIGGSFIELD_API_KEY?.trim();
  if (cliKey && cliKey.includes(":")) {
    return cliKey;
  }

  return null;
}

export function isHiggsfieldConfigured(): boolean {
  return getHiggsfieldCredentials() !== null;
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

  missing.push("HF_CREDENTIALS or HF_API_KEY+HF_API_SECRET");
  return { configured: false, missing, credentialSource: "none" };
}
