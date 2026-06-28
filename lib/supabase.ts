import { createBrowserClient } from "@supabase/ssr";
import { assertSupabaseConfigured } from "./supabase-env";

export function createClient() {
  const { url, anonKey } = assertSupabaseConfigured();

  return createBrowserClient(url, anonKey);
}

export function isSupabaseReady() {
  try {
    assertSupabaseConfigured();
    return true;
  } catch {
    return false;
  }
}
