"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getInitials } from "@/lib/dashboard-data";

type HeaderCardProps = {
  displayName: string;
  avatarUrl?: string | null;
};

export function HeaderCard({ displayName, avatarUrl }: HeaderCardProps) {
  const t = useTranslations("dashboard");
  const format = useFormatter();
  const today = format.dateTime(new Date(), {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <Link
      href="/profile"
      className="dashboard-card flex items-center gap-2.5 px-3 py-2 transition-opacity hover:opacity-90 active:scale-[0.99]"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral text-xs font-bold text-white">
          {getInitials(displayName)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold leading-tight">
          {t("greeting", { name: displayName })}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{today}</p>
      </div>

      <svg
        className="h-4 w-4 shrink-0 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
