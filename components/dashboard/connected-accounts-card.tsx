"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  PlatformIcon,
  PLATFORM_COLORS,
} from "@/components/dashboard/platform-icon";
import type { ConnectedAccount } from "@/lib/dashboard-data";

type ConnectedAccountsCardProps = {
  accounts: ConnectedAccount[];
};

export function ConnectedAccountsCard({ accounts }: ConnectedAccountsCardProps) {
  const t = useTranslations("dashboard");

  return (
    <Link
      href="/accounts"
      className="dashboard-card flex h-full min-h-0 flex-col overflow-hidden p-2.5 transition-opacity hover:opacity-95 active:scale-[0.99]"
    >
      <h2 className="mb-1.5 shrink-0 truncate text-[11px] font-bold md:text-xs">
        {t("connectedAccounts")}
      </h2>

      <div className="grid min-h-0 flex-1 grid-cols-3 place-content-center gap-1">
        {accounts.map(({ platform, connected }) => (
          <div
            key={platform}
            className="flex flex-col items-center justify-center gap-0.5 rounded-lg bg-white p-1"
          >
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
          </div>
        ))}
      </div>
    </Link>
  );
}
