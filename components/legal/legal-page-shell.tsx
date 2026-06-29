import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isOnboardingInProgress } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase-server";
import { isSupabaseConfigured } from "@/lib/supabase-env";

type LegalPageShellProps = {
  children: React.ReactNode;
};

export async function LegalPageShell({ children }: LegalPageShellProps) {
  const t = await getTranslations("legal");

  let backHref: "/login" | "/onboarding" | "/dashboard" = "/login";
  let backLabel = t("backToLogin");

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      if (isOnboardingInProgress(user)) {
        backHref = "/onboarding";
        backLabel = t("backToSetup");
      } else {
        backHref = "/dashboard";
        backLabel = t("backToDashboard");
      }
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href={backHref} className="text-sm font-medium text-coral hover:underline">
          ← {backLabel}
        </Link>
        <div className="mt-6">{children}</div>
        <footer className="mt-10 flex flex-wrap gap-4 border-t border-border pt-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            {t("privacyLink")}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t("termsLink")}
          </Link>
        </footer>
      </div>
    </div>
  );
}
