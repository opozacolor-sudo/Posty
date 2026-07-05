import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function LandingPage() {
  const t = await getTranslations("landing");
  const tCommon = await getTranslations("common");
  const tLegal = await getTranslations("legal");

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-coral shadow-lg">
            <span className="text-2xl font-bold text-white">P</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">{tCommon("appName")}</h1>
          <p className="mt-2 text-lg font-medium text-coral">{t("tagline")}</p>
        </div>

        <p className="mt-8 text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("description")}
        </p>

        <ul className="mt-8 space-y-3 text-sm leading-relaxed text-foreground">
          <li className="rounded-[14px] border border-border bg-white px-4 py-3">
            {t("featureConnect")}
          </li>
          <li className="rounded-[14px] border border-border bg-white px-4 py-3">
            {t("featureChat")}
          </li>
          <li className="rounded-[14px] border border-border bg-white px-4 py-3">
            {t("featureSchedule")}
          </li>
        </ul>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="btn-primary inline-flex min-w-[140px] justify-center rounded-full px-6 py-2.5 text-sm font-semibold"
          >
            {t("getStarted")}
          </Link>
        </div>

        <footer className="mt-12 flex flex-wrap justify-center gap-4 border-t border-border pt-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            {tLegal("privacyLink")}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {tLegal("termsLink")}
          </Link>
        </footer>
      </div>
    </div>
  );
}
