import { redirect } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { fetchUserConnectedAccounts } from "@/lib/connected-accounts";
import { getDisplayName } from "@/lib/dashboard-data";
import { isOnboardingInProgress } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase-server";
import { isSupabaseConfigured } from "@/lib/supabase-env";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function OnboardingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");

  if (!isSupabaseConfigured()) {
    redirect({ href: "/login", locale });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  if (!isOnboardingInProgress(user)) {
    redirect({ href: "/dashboard", locale });
  }

  const onboardingUser = user as NonNullable<typeof user>;
  const email = onboardingUser.email ?? "";
  const initialName = getDisplayName(
    email,
    onboardingUser.user_metadata?.full_name as string | undefined,
  );
  const accounts = await fetchUserConnectedAccounts(supabase, onboardingUser.id);

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto mb-8 max-w-lg text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-coral shadow-lg">
          <span className="text-xl font-bold text-white">P</span>
        </div>
        <p className="text-sm font-semibold text-coral">{t("appName")}</p>
      </div>

      <OnboardingFlow initialName={initialName} accounts={accounts} />
    </div>
  );
}
