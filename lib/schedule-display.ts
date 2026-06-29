const LOCALE_TIMEZONES: Partial<Record<string, string>> = {
  ro: "Europe/Bucharest",
};

export function getScheduleDisplayTimeZone(locale: string): string | undefined {
  return LOCALE_TIMEZONES[locale];
}

export function getDatePartsInTimeZone(
  iso: string,
  timeZone: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

export function formatScheduleDateTime(
  iso: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const timeZone = getScheduleDisplayTimeZone(locale);
  const dateLocale = locale === "ro" ? "ro-RO" : locale;

  return new Intl.DateTimeFormat(dateLocale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
    ...options,
  }).format(new Date(iso));
}
