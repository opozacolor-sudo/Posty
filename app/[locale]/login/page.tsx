import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-coral shadow-lg">
          <span className="text-2xl font-bold text-white">P</span>
        </div>
        <h2 className="text-4xl font-bold tracking-tight">{t("appName")}</h2>
      </div>

      <AuthForm />
    </div>
  );
}
