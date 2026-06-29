"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getComingSoonPlatforms,
  getLivePublishPlatforms,
  getReviewPendingPlatforms,
} from "@/lib/platform-capabilities";

export function AccountsStatusSummary() {
  const t = useTranslations("platformStatus");
  const live = getLivePublishPlatforms();
  const review = getReviewPendingPlatforms();
  const soon = getComingSoonPlatforms();

  function formatList(platforms: ReturnType<typeof getLivePublishPlatforms>) {
    return platforms.map((platform) => t(`platformNames.${platform}`)).join(", ");
  }

  return (
    <div className="mt-4 space-y-2 rounded-[14px] border border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
      {live.length > 0 ? (
        <p>
          <span className="font-semibold text-green">{t("summaryLive")}: </span>
          {formatList(live)}
        </p>
      ) : null}
      {review.length > 0 ? (
        <p>
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            {t("summaryReview")}:{" "}
          </span>
          {formatList(review)}
        </p>
      ) : null}
      {soon.length > 0 ? (
        <p>
          <span className="font-semibold text-foreground">{t("summarySoon")}: </span>
          {formatList(soon)}
        </p>
      ) : null}
      <p>
        {t("summaryFooter")}{" "}
        <Link href="/privacy" className="font-medium text-coral hover:underline">
          {t("privacyLink")}
        </Link>
        .
      </p>
    </div>
  );
}
