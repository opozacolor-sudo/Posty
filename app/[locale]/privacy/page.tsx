import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getLegalDocument } from "@/lib/legal";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const document = getLegalDocument("privacy", locale);

  return (
    <LegalPageShell>
      <h1 className="text-3xl font-bold tracking-tight">{document.title}</h1>
      <LegalDocumentView document={document} lastUpdatedLabel={t("lastUpdated")} />
    </LegalPageShell>
  );
}
