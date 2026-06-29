"use client";

import { useTranslations } from "next-intl";
import type { SocialPlatform } from "@/lib/dashboard-data";
import {
  getPlatformPublishStatus,
  PLATFORM_CAPABILITIES,
  type CapabilityLevel,
} from "@/lib/platform-capabilities";

const BADGE_STYLES: Record<CapabilityLevel, string> = {
  live: "bg-green/10 text-green",
  review: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  soon: "bg-muted text-muted-foreground",
  none: "bg-muted text-muted-foreground",
};

type PlatformCapabilityBadgeProps = {
  platform: SocialPlatform;
  className?: string;
};

export function PlatformCapabilityBadge({
  platform,
  className = "",
}: PlatformCapabilityBadgeProps) {
  const t = useTranslations("platformStatus");
  const status = getPlatformPublishStatus(platform);

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BADGE_STYLES[status]} ${className}`}
    >
      {t(`badges.${status}`)}
    </span>
  );
}

type PlatformCapabilityDetailsProps = {
  platform: SocialPlatform;
};

export function PlatformCapabilityDetails({ platform }: PlatformCapabilityDetailsProps) {
  const t = useTranslations("platformStatus");
  const capabilities = PLATFORM_CAPABILITIES[platform];
  const features: string[] = [];

  if (capabilities.photo === "live") {
    features.push(t("features.photoLive"));
  } else if (capabilities.photo === "review") {
    features.push(t("features.photoReview"));
  }

  if (capabilities.video === "live") {
    features.push(t("features.videoLive"));
  } else if (capabilities.video === "review") {
    features.push(t("features.videoReview"));
  }

  if (capabilities.scheduling && capabilities.oauth !== "soon") {
    features.push(t("features.schedule"));
  }

  return (
    <div className="mt-2 space-y-2">
      <PlatformCapabilityBadge platform={platform} />
      {features.length > 0 ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{features.join(" · ")}</p>
      ) : null}
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t(`hints.${platform}`)}
      </p>
    </div>
  );
}

type AccountsCapabilityLegendProps = {
  className?: string;
};

export function AccountsCapabilityLegend({
  className = "",
}: AccountsCapabilityLegendProps) {
  const t = useTranslations("platformStatus");

  return (
    <div
      className={`rounded-[14px] border border-border bg-card p-4 text-sm shadow-[var(--shadow)] ${className}`}
    >
      <p className="font-semibold text-foreground">{t("legendTitle")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["live", "review", "soon"] as const).map((status) => (
          <span
            key={status}
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_STYLES[status]}`}
          >
            {t(`badges.${status}`)}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("legendBody")}</p>
    </div>
  );
}
