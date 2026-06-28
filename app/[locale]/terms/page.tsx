import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href="/dashboard" className="text-sm font-medium text-coral">
        ← {t("backToDashboard")}
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{t("termsOfService")}</h1>
      <p className="mt-4 text-sm text-muted-foreground">{t("legalPlaceholder")}</p>
    </div>
  );
}
