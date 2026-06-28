import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ConnectPlatformButton } from "@/components/accounts/connect-platform-button";
import { OAuthStatusBanner } from "@/components/dashboard/oauth-status-banner";
import {
  PlatformIcon,
  PLATFORM_COLORS,
} from "@/components/dashboard/platform-icon";
import { createClient } from "@/lib/supabase-server";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import {
  fetchUserConnectedAccounts,
  getFallbackConnectedAccounts,
} from "@/lib/connected-accounts";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("dashboard");

  let accounts = getFallbackConnectedAccounts();

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      accounts = await fetchUserConnectedAccounts(supabase, user.id);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-lg">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-coral"
        >
          ← {t("backToDashboard")}
        </Link>

        <h1 className="text-3xl font-bold tracking-tight">{t("accounts")}</h1>
        <p className="mt-2 text-muted-foreground">{t("accountsSubtitle")}</p>

        <Suspense fallback={null}>
          <OAuthStatusBanner />
        </Suspense>

        <ul className="mt-6 flex flex-col gap-3">
          {accounts.map(({ platform, connected, accountName }) => (
            <li
              key={platform}
              className="dashboard-card flex items-center gap-4 p-4"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{
                  color: PLATFORM_COLORS[platform],
                  backgroundColor: `${PLATFORM_COLORS[platform]}14`,
                }}
              >
                <PlatformIcon platform={platform} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-bold capitalize">{t(`platforms.${platform}`)}</p>
                <p
                  className={`text-sm font-medium ${
                    connected ? "text-green" : "text-muted-foreground"
                  }`}
                >
                  {connected
                    ? accountName
                      ? t("connectedAs", { name: accountName })
                      : t("connected")
                    : t("notConnected")}
                </p>
              </div>

              <ConnectPlatformButton platform={platform} connected={connected} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
