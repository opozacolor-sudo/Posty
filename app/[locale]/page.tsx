import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { LandingPage } from "@/components/marketing/landing-page";
import { isOnboardingInProgress } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase-server";
import { isSupabaseConfigured } from "@/lib/supabase-env";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect({
        href: isOnboardingInProgress(user) ? "/onboarding" : "/dashboard",
        locale,
      });
    }
  }

  return <LandingPage />;
}
