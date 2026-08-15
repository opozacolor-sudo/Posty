import { getTranslations, setRequestLocale } from "next-intl/server";
import { HowItWorksView } from "@/components/legal/how-it-works-view";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getHowItWorksContent } from "@/lib/how-it-works";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HowItWorksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("howItWorks");
  const content = getHowItWorksContent(locale);

  return (
    <LegalPageShell wide>
      <h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
      <HowItWorksView
        content={content}
        lastUpdatedLabel={t("lastUpdated")}
        statusLabels={{
          live: t("status.live"),
          review: t("status.review"),
          soon: t("status.soon"),
          none: t("status.none"),
        }}
        tableHeaders={{
          format: t("table.format"),
          media: t("table.media"),
          status: t("table.status"),
          command: t("table.command"),
        }}
      />
    </LegalPageShell>
  );
}
