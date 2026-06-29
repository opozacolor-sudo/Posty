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
  const visible = posts.slice(0, 3);

  return (
    <div className="dashboard-card flex h-full min-h-0 flex-col overflow-hidden p-2.5">
      <h2 className="mb-1.5 shrink-0 truncate text-[11px] font-bold md:text-xs">
        {t("upcomingPosts")}
      </h2>

      {visible.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-[10px] text-muted-foreground">
          {t("noUpcomingPosts")}
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col justify-center gap-1 overflow-hidden">
          {visible.map((post) => (
            <li
              key={post.id}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white p-1.5"
            >
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white md:h-7 md:w-7"
                style={{ backgroundColor: post.thumbnailColor }}
              >
                <PlatformIcon platform={post.platform} className="h-3 w-3" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold leading-tight md:text-[11px]">
                  {post.title}
                </p>
                <p className="truncate text-[9px] text-muted-foreground md:text-[10px]">
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
