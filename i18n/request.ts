import { getRequestConfig } from "next-intl/server";
import { routing, type Locale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  const localeMessages = (await import(`../messages/${locale}.json`)).default;
  const englishMessages =
    locale === "en" ? null : (await import("../messages/en.json")).default;

  return {
    locale,
    messages: {
      ...(englishMessages ?? {}),
      ...localeMessages,
      legal: localeMessages.legal ?? englishMessages?.legal,
      platformStatus:
        localeMessages.platformStatus ?? englishMessages?.platformStatus,
    },
  };
});
