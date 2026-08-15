"use client";

import { useLocale, useFormatter, useTranslations } from "next-intl";
import { PlatformIcon } from "@/components/dashboard/platform-icon";
import type { ScheduledPost } from "@/lib/dashboard-data";
import { getScheduleDisplayTimeZone } from "@/lib/schedule-display";

type UpcomingPostsCardProps = {
  posts: ScheduledPost[];
};

export function UpcomingPostsCard({ posts }: UpcomingPostsCardProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const format = useFormatter();
  const timeZone = getScheduleDisplayTimeZone(locale);
  const visible = posts.slice(0, 2);

  return (
    <div className="dashboard-card flex h-full min-h-0 flex-col overflow-hidden p-2">
      <h2 className="mb-1 shrink-0 truncate text-[10px] font-bold">
        {t("upcomingPosts")}
      </h2>

      {visible.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-[9px] leading-tight text-muted-foreground">
          {t("noUpcomingPosts")}
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col justify-start gap-0.5 overflow-hidden">
          {visible.map((post) => (
            <li
              key={post.id}
              className="flex shrink-0 items-center gap-1 rounded-md bg-white p-1"
            >
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: post.thumbnailColor }}
              >
                <PlatformIcon platform={post.platform} className="h-2.5 w-2.5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[9px] font-semibold leading-tight">
                  {post.title}
                </p>
                <p className="truncate text-[8px] text-muted-foreground">
                  {format.dateTime(new Date(post.scheduledAt), {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    ...(timeZone ? { timeZone } : {}),
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
