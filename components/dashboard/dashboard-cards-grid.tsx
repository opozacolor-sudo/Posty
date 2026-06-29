"use client";

import { useEffect, useRef, useState } from "react";
import { ConnectedAccountsCard } from "@/components/dashboard/connected-accounts-card";
import { UpcomingPostsCard } from "@/components/dashboard/upcoming-posts-card";
import { StatisticsCard } from "@/components/dashboard/statistics-card";
import { CalendarCard } from "@/components/dashboard/calendar-card";
import type {
  ConnectedAccount,
  PlatformStats,
  ScheduledPost,
} from "@/lib/dashboard-data";
import type { PlatformStatsResult } from "@/lib/stats/types";

type DashboardCardsGridProps = {
  accounts: ConnectedAccount[];
  posts: ScheduledPost[];
  stats: PlatformStatsResult[];
  statsLoading?: boolean;
  scheduledDays: number[];
};

export function DashboardCardsGrid({
  accounts,
  posts,
  stats,
  statsLoading = false,
  scheduledDays,
}: DashboardCardsGridProps) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState<number | null>(null);

  useEffect(() => {
    const element = calendarRef.current;
    if (!element) return;

    const updateHeight = () => {
      setCardHeight(element.offsetHeight);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    window.addEventListener("resize", updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  const synced = cardHeight !== null;
  const rowStyle = synced ? { gridAutoRows: `${cardHeight}px` } : undefined;
  const cellClass = synced
    ? "h-full min-h-0 overflow-hidden"
    : "min-h-0 overflow-hidden";

  return (
    <div
      className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3"
      style={rowStyle}
    >
      <div className={cellClass}>
        <ConnectedAccountsCard accounts={accounts} />
      </div>
      <div className={cellClass}>
        <UpcomingPostsCard posts={posts} />
      </div>
      <div className={cellClass}>
        <StatisticsCard
          accounts={accounts}
          stats={stats}
          loading={statsLoading}
        />
      </div>
      <div
        ref={calendarRef}
        className={synced ? cellClass : "self-start"}
      >
        <CalendarCard scheduledDays={scheduledDays} fillHeight={synced} />
      </div>
    </div>
  );
}
