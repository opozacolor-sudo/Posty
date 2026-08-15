"use client";

import { ConnectedAccountsCard } from "@/components/dashboard/connected-accounts-card";
import { UpcomingPostsCard } from "@/components/dashboard/upcoming-posts-card";
import { CalendarCard } from "@/components/dashboard/calendar-card";
import type { ConnectedAccount, ScheduledPost } from "@/lib/dashboard-data";

type DashboardCardsGridProps = {
  accounts: ConnectedAccount[];
  posts: ScheduledPost[];
  scheduledDays: number[];
};

export function DashboardCardsGrid({
  accounts,
  posts,
  scheduledDays,
}: DashboardCardsGridProps) {
  return (
    <div className="mt-1.5 grid max-h-[148px] grid-cols-3 gap-1.5 sm:max-h-[156px] sm:gap-2 lg:max-h-[164px]">
      <ConnectedAccountsCard accounts={accounts} />
      <UpcomingPostsCard posts={posts} />
      <CalendarCard scheduledDays={scheduledDays} />
    </div>
  );
}
