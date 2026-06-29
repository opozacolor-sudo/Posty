"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import type { ConnectedAccount, PlatformStats } from "@/lib/dashboard-data";
import type { PlatformStatsResult } from "@/lib/stats/types";

type StatisticsCardProps = {
  accounts: ConnectedAccount[];
  stats: PlatformStatsResult[];
  loading?: boolean;
};

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return value.toString();
}

function formatMetric(value: number, unavailable?: boolean): string {
  if (unavailable && value === 0) {
    return "—";
  }
  return formatNumber(value);
}

export function StatisticsCard({
  accounts,
  stats,
  loading = false,
}: StatisticsCardProps) {
  const t = useTranslations("dashboard");

  const connectedStats = useMemo(() => {
    const connectedPlatforms = new Set(
      accounts.filter((account) => account.connected).map((account) => account.platform),
    );

    return stats.filter((item) => connectedPlatforms.has(item.platform));
  }, [accounts, stats]);

  const [activePlatform, setActivePlatform] = useState(
    connectedStats[0]?.platform ?? accounts.find((a) => a.connected)?.platform,
  );

  useEffect(() => {
    if (
      connectedStats.length > 0 &&
      !connectedStats.some((item) => item.platform === activePlatform)
    ) {
      setActivePlatform(connectedStats[0].platform);
    }
  }, [activePlatform, connectedStats]);

  const activeStats = connectedStats.find((item) => item.platform === activePlatform);

  return (
    <div className="dashboard-card flex h-full min-h-0 flex-col overflow-hidden p-2.5">
      <div className="mb-1.5 shrink-0">
        <h2 className="truncate text-[11px] font-bold md:text-xs">{t("statistics")}</h2>
        <p className="truncate text-[8px] text-muted-foreground md:text-[9px]">
          {loading ? t("statsLoading") : t("statsPeriodHint")}
        </p>
      </div>

      {connectedStats.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-center text-[10px] text-muted-foreground">
          {t("statsConnectHint")}
        </p>
      ) : (
        <>
          <div className="mb-1.5 flex shrink-0 gap-0.5 overflow-x-auto">
            {connectedStats.map(({ platform }) => (
              <button
                key={platform}
                type="button"
                onClick={() => setActivePlatform(platform)}
                className={`flex shrink-0 items-center rounded-full p-1 transition-colors ${
                  activePlatform === platform
                    ? "bg-coral text-white"
                    : "bg-white text-muted-foreground"
                }`}
                aria-label={t(`platforms.${platform}`)}
              >
                <PlatformIcon platform={platform} className="h-3 w-3" />
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center text-[10px] text-muted-foreground">
              {t("statsLoading")}
            </div>
          ) : activeStats ? (
            <div className="grid min-h-0 flex-1 grid-cols-3 place-content-center gap-1">
              {(
                [
                  { key: "views", value: activeStats.views, accent: "text-coral" },
                  { key: "likes", value: activeStats.likes, accent: "text-green" },
                  {
                    key: "comments",
                    value: activeStats.comments,
                    accent: "text-foreground",
                  },
                ] as const
              ).map(({ key, value, accent }) => (
                <div
                  key={key}
                  className="flex flex-col items-center justify-center rounded-lg bg-white px-1 py-2"
                >
                  <p className={`text-sm font-bold leading-none ${accent}`}>
                    {formatMetric(value, activeStats.unavailable)}
                  </p>
                  <p className="mt-0.5 text-[8px] font-medium text-muted-foreground md:text-[9px]">
                    {t(key)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {!loading && activeStats?.unavailable ? (
            <p className="mt-1 shrink-0 text-center text-[8px] text-muted-foreground md:text-[9px]">
              {t("statsUnavailable")}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
