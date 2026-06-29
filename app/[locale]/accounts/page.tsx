import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AccountsCapabilityLegend } from "@/components/accounts/platform-capability";
import { AccountsStatusSummary } from "@/components/accounts/accounts-status-summary";
import { PlatformCapabilityDetails } from "@/components/accounts/platform-capability";
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
import { isOnboardingInProgress } from "@/lib/onboarding";
import { canConnectPlatform } from "@/lib/platform-capabilities";
import { getPlatformConnectHref } from "@/lib/oauth-platforms";
import { buildTikTokConnectPath } from "@/lib/tiktok-oauth";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("dashboard");
  const tOnboarding = await getTranslations("onboarding");
  const tStatus = await getTranslations("platformStatus");

  let accounts = getFallbackConnectedAccounts();
  let onboardingInProgress = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      accounts = await fetchUserConnectedAccounts(supabase, user.id);
      onboardingInProgress = isOnboardingInProgress(user);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-lg">
        <Link
          href={onboardingInProgress ? "/onboarding" : "/dashboard"}
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-coral"
        >
          ←{" "}
          {onboardingInProgress ? tOnboarding("backToSetup") : t("backToDashboard")}
        </Link>

        {onboardingInProgress ? (
          <div className="mb-6 rounded-[14px] border border-coral/20 bg-coral/5 px-4 py-3 text-sm text-foreground">
            <p>{tOnboarding("accountsBanner")}</p>
            <Link
              href="/onboarding"
              className="mt-2 inline-block font-semibold text-coral hover:underline"
            >
              {tOnboarding("continueSetup")}
            </Link>
          </div>
        ) : null}

        <h1 className="text-3xl font-bold tracking-tight">{t("accounts")}</h1>
        <p className="mt-2 text-muted-foreground">{t("accountsSubtitle")}</p>

        <Suspense fallback={null}>
          <OAuthStatusBanner />
        </Suspense>

        <AccountsCapabilityLegend className="mt-6" />
        <AccountsStatusSummary />

        <ul className="mt-6 flex flex-col gap-3">
          {accounts.map(({ platform, connected, accountName }) => (
            <li
              key={platform}
              className="relative flex flex-col gap-3 overflow-visible rounded-[14px] border border-border bg-card p-4 shadow-[var(--shadow)] sm:flex-row sm:items-start"
            >
              <div className="flex min-w-0 flex-1 gap-4">
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
                  <PlatformCapabilityDetails platform={platform} />
                </div>
              </div>

              <div className="relative z-10 flex shrink-0 flex-col items-stretch gap-2 sm:items-end sm:pt-1">
                {connected ? (
                  <>
                    {platform === "tiktok" ? (
                      <>
                        <a
                          href={buildTikTokConnectPath(locale, "basic")}
                          className="inline-flex cursor-pointer rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted no-underline"
                        >
                          {t("reconnect")}
                        </a>
                        <a
                          href={buildTikTokConnectPath(locale, { publish: true })}
                          className="inline-flex cursor-pointer rounded-full border border-coral/30 bg-coral/5 px-4 py-2 text-sm font-semibold text-coral transition-colors hover:bg-coral/10 no-underline"
                        >
                          {t("tiktokEnableVideo")}
                        </a>
                      </>
                    ) : null}
                    <form action="/api/accounts/disconnect" method="POST">
                    <input type="hidden" name="platform" value={platform} />
                    <input type="hidden" name="locale" value={locale} />
                    <button
                      type="submit"
                      className="inline-flex cursor-pointer rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      {t("disconnect")}
                    </button>
                  </form>
                  </>
                ) : canConnectPlatform(platform) ? (
                  <a
                    href={getPlatformConnectHref(platform, locale) ?? "#"}
                    className="btn-primary inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold no-underline"
                  >
                    {t("connect")}
                  </a>
                ) : (
                  <span className="inline-flex items-center justify-center rounded-full border border-border bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">
                    {tStatus("badges.soon")}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
