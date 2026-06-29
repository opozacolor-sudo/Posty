"use client";

import { useTranslations } from "next-intl";
import type { SocialPlatform } from "@/lib/dashboard-data";
import {
  getPlatformPublishStatus,
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
