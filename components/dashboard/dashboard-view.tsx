"use client";

import { useCallback, useMemo, useState } from "react";
import { HeaderCard } from "@/components/dashboard/header-card";
import { DashboardCardsGrid } from "@/components/dashboard/dashboard-cards-grid";
import { ChatBar } from "@/components/dashboard/chat-bar";
import {
  getFallbackConnectedAccounts,
} from "@/lib/connected-accounts";
import {
  MOCK_PLATFORM_STATS,
  type ConnectedAccount,
  type ScheduledPost,
} from "@/lib/dashboard-data";
import { getScheduledDaysForMonth } from "@/lib/scheduled-posts";

type DashboardViewProps = {
  displayName: string;
  avatarUrl?: string | null;
  accounts?: ConnectedAccount[];
  initialPosts?: ScheduledPost[];
};

export function DashboardView({
  displayName,
  avatarUrl,
  accounts,
  initialPosts = [],
}: DashboardViewProps) {
  const connectedAccounts = accounts ?? getFallbackConnectedAccounts();
  const [posts, setPosts] = useState<ScheduledPost[]>(initialPosts);

  const scheduledDays = useMemo(() => {
    const now = new Date();
    return getScheduledDaysForMonth(posts, now.getFullYear(), now.getMonth());
  }, [posts]);

  const refreshPosts = useCallback(async () => {
    try {
      const response = await fetch("/api/scheduled-posts", {
        credentials: "same-origin",
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { posts?: ScheduledPost[] };
      if (data.posts) {
        setPosts(data.posts);
      }
    } catch {
      // Keep existing posts on network failure.
    }
  }, []);

  return (
    <div className="dashboard-shell flex flex-col">
      <section className="shrink-0 px-3 pt-2 lg:px-4">
        <HeaderCard displayName={displayName} avatarUrl={avatarUrl} />
        <DashboardCardsGrid
          accounts={connectedAccounts}
          posts={posts}
          stats={MOCK_PLATFORM_STATS}
          scheduledDays={scheduledDays}
        />
      </section>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChatBar onScheduleCreated={refreshPosts} />
      </section>
    </div>
  );
}
