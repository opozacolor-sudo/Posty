"use client";

import { HeaderCard } from "@/components/dashboard/header-card";
import { DashboardCardsGrid } from "@/components/dashboard/dashboard-cards-grid";
import { ChatBar } from "@/components/dashboard/chat-bar";
import {
  getFallbackConnectedAccounts,
} from "@/lib/connected-accounts";
import {
  MOCK_PLATFORM_STATS,
  MOCK_SCHEDULED_DAYS,
  MOCK_UPCOMING_POSTS,
  type ConnectedAccount,
} from "@/lib/dashboard-data";

type DashboardViewProps = {
  displayName: string;
  avatarUrl?: string | null;
  accounts?: ConnectedAccount[];
};

export function DashboardView({
  displayName,
  avatarUrl,
  accounts,
}: DashboardViewProps) {
  const connectedAccounts = accounts ?? getFallbackConnectedAccounts();

  return (
    <div className="dashboard-shell flex flex-col">
      <section className="shrink-0 px-3 pt-2 lg:px-4">
        <HeaderCard displayName={displayName} avatarUrl={avatarUrl} />
        <DashboardCardsGrid
          accounts={connectedAccounts}
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
