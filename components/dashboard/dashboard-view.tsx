"use client";

import { HeaderCard } from "@/components/dashboard/header-card";
import { DashboardCardsGrid } from "@/components/dashboard/dashboard-cards-grid";
import { ChatBar } from "@/components/dashboard/chat-bar";
import {
  MOCK_CONNECTED_ACCOUNTS,
  MOCK_PLATFORM_STATS,
  MOCK_SCHEDULED_DAYS,
  MOCK_UPCOMING_POSTS,
} from "@/lib/dashboard-data";

type DashboardViewProps = {
  displayName: string;
  avatarUrl?: string | null;
};

export function DashboardView({ displayName, avatarUrl }: DashboardViewProps) {
  return (
    <div className="dashboard-shell flex flex-col">
      <section className="shrink-0 px-3 pt-2 lg:px-4">
        <HeaderCard displayName={displayName} avatarUrl={avatarUrl} />
        <DashboardCardsGrid
          accounts={MOCK_CONNECTED_ACCOUNTS}
          posts={MOCK_UPCOMING_POSTS}
          stats={MOCK_PLATFORM_STATS}
          scheduledDays={MOCK_SCHEDULED_DAYS}
        />
      </section>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChatBar />
      </section>
    </div>
  );
}
