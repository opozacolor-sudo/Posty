import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { OAuthStatusBanner } from "@/components/dashboard/oauth-status-banner";
import {
  PlatformIcon,
  PLATFORM_COLORS,
} from "@/components/dashboard/platform-icon";
import { createClient } from "@/lib/supabase-server";
import { buildTikTokConnectPath } from "@/lib/tiktok-oauth";
import { isSupabaseConfigured } from "@/lib/supabase-env";
import {
  fetchUserConnectedAccounts,
  getFallbackConnectedAccounts,
} from "@/lib/connected-accounts";

function getPlatformConnectHref(platform: string, locale: string): string {
  if (platform === "tiktok") {
    return buildTikTokConnectPath(locale, "basic");
  }

  return `/api/auth/${platform}?locale=${locale}`;
}

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
              className="relative flex items-center gap-4 overflow-visible rounded-[14px] border border-border bg-card p-4 shadow-[var(--shadow)]"
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

              <div className="relative z-10 flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                {connected ? (
                  <>
                    {platform === "tiktok" ? (
                      <a
                        href={buildTikTokConnectPath(locale, { publish: true })}
                        className="inline-flex cursor-pointer rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted no-underline"
                      >
                        {t("reconnect")}
                      </a>
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
                ) : (
                  <a
                    href={getPlatformConnectHref(platform, locale)}
                    className="btn-primary inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold no-underline"
                  >
                    {t("connect")}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
