import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";

function getPreferredLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return routing.defaultLocale;

  const preferred = acceptLanguage
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return {
        lang: lang.split("-")[0].toLowerCase(),
        q: q ? parseFloat(q) : 1,
      };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of preferred) {
    if (routing.locales.includes(lang as Locale)) {
      return lang as Locale;
    }
  }

  return routing.defaultLocale;
}

export default async function RootPage() {
  const headersList = await headers();
  const locale = getPreferredLocale(headersList.get("accept-language"));
  redirect(`/${locale}/dashboard`);
}
