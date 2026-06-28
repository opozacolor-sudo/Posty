"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import { PLATFORMS, type PlatformStats } from "@/lib/dashboard-data";

type StatisticsCardProps = {
  stats: PlatformStats[];
};

function formatNumber(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return value.toString();
}

export function StatisticsCard({ stats }: StatisticsCardProps) {
  const t = useTranslations("dashboard");
  const [activePlatform, setActivePlatform] = useState(
    stats[0]?.platform ?? PLATFORMS[0],
  );

  const activeStats = stats.find((s) => s.platform === activePlatform);

  return (
    <div className="dashboard-card flex h-full min-h-0 flex-col overflow-hidden p-2.5">
      <h2 className="mb-1.5 shrink-0 truncate text-[11px] font-bold md:text-xs">
        {t("statistics")}
      </h2>

      <div className="mb-1.5 flex shrink-0 gap-0.5 overflow-x-auto">
        {stats.map(({ platform }) => (
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

      {activeStats && (
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
                {formatNumber(value)}
              </p>
              <p className="mt-0.5 text-[8px] font-medium text-muted-foreground md:text-[9px]">
                {t(key)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
