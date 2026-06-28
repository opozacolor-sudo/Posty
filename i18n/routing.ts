import { defineRouting } from "next-intl/routing";

export const locales = [
  "en",
  "ro",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "ru",
  "ar",
  "zh",
  "ja",
  "ko",
  "hi",
] as const;

export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localeDetection: true,
});
