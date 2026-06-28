import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase-server";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getDisplayName } from "@/lib/dashboard-data";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");

  let displayName = t("defaultUser");
  let avatarUrl: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const email = user?.email ?? "";
    displayName = getDisplayName(
      email,
      user?.user_metadata?.full_name as string | undefined,
    );
    avatarUrl =
      (user?.user_metadata?.avatar_url as string | undefined) ?? null;
  }

  return (
    <DashboardView displayName={displayName} avatarUrl={avatarUrl} />
  );
}
