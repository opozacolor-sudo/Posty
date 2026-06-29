import type { User } from "@supabase/supabase-js";

export function isOnboardingInProgress(user: User | null | undefined): boolean {
  return user?.user_metadata?.onboarding_completed === false;
}

export function isOnboardingRoute(pathWithoutLocale: string): boolean {
  return (
    pathWithoutLocale === "/onboarding" ||
    pathWithoutLocale === "/accounts" ||
    pathWithoutLocale.startsWith("/accounts/")
  );
}
