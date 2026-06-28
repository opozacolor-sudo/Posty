import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  PlatformIcon,
  PLATFORM_COLORS,
} from "@/components/dashboard/platform-icon";
import { MOCK_CONNECTED_ACCOUNTS } from "@/lib/dashboard-data";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AccountsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("dashboard");

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

        <ul className="mt-6 flex flex-col gap-3">
          {MOCK_CONNECTED_ACCOUNTS.map(({ platform, connected }) => (
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
                  {connected ? t("connected") : t("notConnected")}
                </p>
              </div>

              <button
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  connected
                    ? "border border-border bg-white text-foreground"
                    : "btn-primary py-2"
                }`}
              >
                {connected ? t("disconnect") : t("connect")}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
