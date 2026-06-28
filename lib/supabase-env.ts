const PLACEHOLDER_PATTERNS = [
  "placeholder",
  "your_supabase",
  "xxx",
  "example.com",
];

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseEnv();

  if (!url || !anonKey) return false;
  if (!url.startsWith("https://") || !url.includes(".supabase.co")) return false;

  const combined = `${url} ${anonKey}`.toLowerCase();
  return !PLACEHOLDER_PATTERNS.some((pattern) => combined.includes(pattern));
}

export function assertSupabaseConfigured(): { url: string; anonKey: string } {
  const { url, anonKey } = getSupabaseEnv();

  if (!isSupabaseConfigured() || !url || !anonKey) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  return { url, anonKey };
}
