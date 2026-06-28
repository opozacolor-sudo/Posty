"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";

export function LanguageSelector() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("language");

  function handleChange(nextLocale: string) {
    router.replace(pathname, { locale: nextLocale as Locale });
  }

  return (
    <div className="rounded-xl bg-white px-3 py-3">
      <label
        htmlFor="language-select"
        className="mb-1.5 block text-xs font-medium text-muted-foreground"
      >
        {t("label")}
      </label>
      <select
        id="language-select"
        value={locale}
        onChange={(e) => handleChange(e.target.value)}
        className="input-field py-2 text-sm"
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {t(code)}
          </option>
        ))}
      </select>
    </div>
  );
}
