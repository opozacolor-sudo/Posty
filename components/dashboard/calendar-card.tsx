"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

type CalendarCardProps = {
  scheduledDays: number[];
  className?: string;
};

export function CalendarCard({ scheduledDays, className = "" }: CalendarCardProps) {
  const t = useTranslations("dashboard");
  const format = useFormatter();
  const [currentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = currentDate.getDate();

  const monthLabel = format.dateTime(currentDate, { month: "short" });

  const { calendarDays, weekCount } = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const cells: Array<{
      day: number | null;
      hasPost: boolean;
      isToday: boolean;
    }> = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, hasPost: false, isToday: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        day,
        hasPost: scheduledDays.includes(day),
        isToday: day === today,
      });
    }

    const totalCells = startOffset + daysInMonth;
    const rows = Math.ceil(totalCells / 7);

    return { calendarDays: cells, weekCount: rows };
  }, [year, month, today, scheduledDays]);

  const weekDays = [
    t("weekdays.mon"),
    t("weekdays.tue"),
    t("weekdays.wed"),
    t("weekdays.thu"),
    t("weekdays.fri"),
    t("weekdays.sat"),
    t("weekdays.sun"),
  ];

  return (
    <div className={`dashboard-card flex h-full min-h-0 flex-col overflow-hidden p-2 ${className}`}>
      <div className="mb-1 flex shrink-0 items-center justify-between">
        <h2 className="text-[10px] font-bold">{t("calendar")}</h2>
        <span className="text-[9px] font-medium text-muted-foreground">{monthLabel}</span>
      </div>

      <div className="mb-0.5 grid shrink-0 grid-cols-7 gap-px">
        {weekDays.map((label) => (
          <div
            key={label}
            className="text-center text-[6px] font-semibold text-muted-foreground sm:text-[7px]"
          >
            {label.charAt(0)}
          </div>
        ))}
      </div>

      <div
        className="grid min-h-0 flex-1 grid-cols-7 gap-px"
        style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
      >
        {calendarDays.map((cell, index) =>
          cell.day === null ? (
            <div key={`empty-${index}`} />
          ) : (
            <div key={cell.day} className="relative flex items-center justify-center">
              <div
                className={`flex h-3.5 w-3.5 items-center justify-center rounded text-[7px] font-semibold sm:h-4 sm:w-4 sm:text-[8px] ${
                  cell.isToday
                    ? "bg-coral text-white"
                    : cell.hasPost
                      ? "bg-white text-foreground"
                      : "text-muted-foreground"
                }`}
              >
                {cell.day}
              </div>
              {cell.hasPost && !cell.isToday && (
                <span className="absolute bottom-0 h-0.5 w-0.5 rounded-full bg-coral" />
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
