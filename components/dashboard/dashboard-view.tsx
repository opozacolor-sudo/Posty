"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { HeaderCard } from "@/components/dashboard/header-card";
import { DashboardCardsGrid } from "@/components/dashboard/dashboard-cards-grid";
import { ChatBar } from "@/components/dashboard/chat-bar";
import {
  getFallbackConnectedAccounts,
} from "@/lib/connected-accounts";
import {
  PLATFORMS,
  type ConnectedAccount,
  type ScheduledPost,
} from "@/lib/dashboard-data";
import { emptyStats } from "@/lib/stats/types";
import type { PlatformStatsResult } from "@/lib/stats/types";
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
  const [stats, setStats] = useState<PlatformStatsResult[]>(() =>
    PLATFORMS.map((platform) => emptyStats(platform)),
  );
  const [statsLoading, setStatsLoading] = useState(true);
  const locale = useLocale();

  const scheduledDays = useMemo(() => {
    const now = new Date();
    return getScheduledDaysForMonth(
      posts,
      now.getFullYear(),
      now.getMonth(),
      locale,
    );
  }, [locale, posts]);

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

  const refreshStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch("/api/stats", {
        credentials: "same-origin",
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { stats?: PlatformStatsResult[] };
      if (data.stats) {
        setStats(data.stats);
      }
    } catch {
      // Keep existing stats on network failure.
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  return (
    <div className="dashboard-shell flex flex-col">
      <section className="shrink-0 px-3 pt-2 lg:px-4">
        <HeaderCard displayName={displayName} avatarUrl={avatarUrl} />
        <DashboardCardsGrid
          accounts={connectedAccounts}
          posts={posts}
          stats={stats}
          statsLoading={statsLoading}
          scheduledDays={scheduledDays}
        />
      </section>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChatBar onScheduleCreated={refreshPosts} />
      </section>
    </div>
  );
}
