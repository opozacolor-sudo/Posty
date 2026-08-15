"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  PlatformIcon,
  PLATFORM_COLORS,
} from "@/components/dashboard/platform-icon";
import type { ConnectedAccount } from "@/lib/dashboard-data";
import {
  getPlatformPublishStatus,
  type CapabilityLevel,
} from "@/lib/platform-capabilities";

type ConnectedAccountsCardProps = {
  accounts: ConnectedAccount[];
};

function connectionDotClass(connected: boolean, publishStatus: CapabilityLevel): string {
  if (!connected || publishStatus === "soon") {
    return "bg-muted-foreground/40";
  }

  return "bg-green";
}

export function ConnectedAccountsCard({ accounts }: ConnectedAccountsCardProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();

  function openAccounts() {
    router.push("/accounts");
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={openAccounts}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openAccounts();
        }
      }}
      className="dashboard-card flex h-full min-h-0 cursor-pointer flex-col overflow-hidden p-2 transition-opacity hover:opacity-95 active:scale-[0.99]"
    >
      <div className="mb-1 flex shrink-0 items-center justify-between gap-1">
        <h2 className="truncate text-[10px] font-bold">
          {t("connectedAccounts")}
        </h2>
        <svg
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <div className="pointer-events-none grid min-h-0 flex-1 grid-cols-3 place-content-start gap-0.5 overflow-hidden">
        {accounts.map(({ platform, connected, accountName }) => (
          <div
            key={platform}
            className="flex flex-col items-center justify-center gap-0 rounded-md bg-white p-0.5"
          >
            <div
              className="relative flex h-5 w-5 items-center justify-center rounded-md sm:h-6 sm:w-6"
              style={{
                color: PLATFORM_COLORS[platform],
                backgroundColor: `${PLATFORM_COLORS[platform]}14`,
              }}
            >
              <PlatformIcon platform={platform} className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              <span
                className={`absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-white ${connectionDotClass(
                  connected,
                  getPlatformPublishStatus(platform),
                )}`}
              />
            </div>
            {connected && accountName && platform === "instagram" && (
              <span className="max-w-full truncate text-[7px] font-medium text-muted-foreground">
                @{accountName.replace(/^@/, "")}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
