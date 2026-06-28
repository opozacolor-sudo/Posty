"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  PlatformIcon,
  PLATFORM_COLORS,
} from "@/components/dashboard/platform-icon";
import {
  INSTAGRAM_OAUTH_PATH,
  isOAuthPlatform,
} from "@/lib/connected-accounts";
import type { ConnectedAccount } from "@/lib/dashboard-data";

type ConnectedAccountsCardProps = {
  accounts: ConnectedAccount[];
};

export function ConnectedAccountsCard({ accounts }: ConnectedAccountsCardProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  function handlePlatformClick(
    event: React.MouseEvent,
    platform: ConnectedAccount["platform"],
    connected: boolean,
  ) {
    if (!isOAuthPlatform(platform) || connected) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    window.location.href = `${INSTAGRAM_OAUTH_PATH}?locale=${locale}`;
  }

  return (
    <div className="dashboard-card flex h-full min-h-0 flex-col overflow-hidden p-2.5">
      <Link
        href="/accounts"
        className="mb-1.5 shrink-0 truncate text-[11px] font-bold transition-opacity hover:opacity-80 md:text-xs"
      >
        {t("connectedAccounts")}
      </Link>

      <div className="grid min-h-0 flex-1 grid-cols-3 place-content-center gap-1">
        {accounts.map(({ platform, connected, accountName }) => {
          const isInstagramConnect = isOAuthPlatform(platform) && !connected;

          const content = (
            <>
              <div
                className="relative flex h-6 w-6 items-center justify-center rounded-md md:h-7 md:w-7"
                style={{
                  color: PLATFORM_COLORS[platform],
                  backgroundColor: `${PLATFORM_COLORS[platform]}14`,
                }}
              >
                <PlatformIcon
                  platform={platform}
                  className="h-3 w-3 md:h-3.5 md:w-3.5"
                />
                <span
                  className={`absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-white ${
                    connected ? "bg-green" : "bg-muted-foreground/40"
                  }`}
                />
              </div>
              {connected && accountName && platform === "instagram" && (
                <span className="max-w-full truncate text-[9px] font-medium text-muted-foreground">
                  @{accountName.replace(/^@/, "")}
                </span>
              )}
            </>
          );

          if (isInstagramConnect) {
            return (
              <button
                key={platform}
                type="button"
                onClick={(event) => handlePlatformClick(event, platform, connected)}
                className="flex flex-col items-center justify-center gap-0.5 rounded-lg bg-white p-1 transition-opacity hover:opacity-80"
                aria-label={t("connectInstagram")}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={platform}
              href="/accounts"
              className="flex flex-col items-center justify-center gap-0.5 rounded-lg bg-white p-1 transition-opacity hover:opacity-80"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
