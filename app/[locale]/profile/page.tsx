import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase-server";
import { SignOutButton } from "@/components/sign-out-button";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { LanguageSelector } from "@/components/language-selector";
import { ProfileForm } from "@/components/profile/profile-form";
import { BrandProfileForm } from "@/components/profile/brand-profile-form";
import { parseBrandProfile } from "@/lib/brand-profile";
import {
  getDisplayName,
  getInitials,
  MOCK_CONNECTED_ACCOUNTS,
  MOCK_UPCOMING_POSTS,
} from "@/lib/dashboard-data";

type Props = {
  params: Promise<{ locale: string }>;
};

function MenuRow({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 transition-opacity hover:opacity-80"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <svg
        className="h-4 w-4 shrink-0 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("profile");
  const tDashboard = await getTranslations("dashboard");
  const format = await getFormatter();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "";
  const displayName = getDisplayName(
    email,
    user?.user_metadata?.full_name as string | undefined,
  );
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const brandProfile = parseBrandProfile(user?.user_metadata?.brand_profile);
  const memberSince = user?.created_at
    ? format.dateTime(new Date(user.created_at), {
        month: "long",
        year: "numeric",
      })
    : null;

  const connectedCount = MOCK_CONNECTED_ACCOUNTS.filter((a) => a.connected).length;
  const scheduledCount = MOCK_UPCOMING_POSTS.length;

  return (
    <div className="min-h-screen bg-background px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-lg space-y-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-coral"
        >
          ← {t("backToDashboard")}
        </Link>

        <div className="dashboard-card p-5 text-center">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="mx-auto h-20 w-20 rounded-full object-cover ring-4 ring-white"
            />
          ) : (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-coral text-2xl font-bold text-white ring-4 ring-white">
              {getInitials(displayName)}
            </div>
          )}

          <h1 className="mt-3 text-xl font-bold">{displayName}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{email}</p>
          {memberSince && (
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {t("memberSince", { date: memberSince })}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="dashboard-card p-4 text-center">
            <p className="text-2xl font-bold text-coral">{scheduledCount}</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {t("statsScheduled")}
            </p>
          </div>
          <div className="dashboard-card p-4 text-center">
            <p className="text-2xl font-bold text-green">{connectedCount}</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {t("statsConnected")}
            </p>
          </div>
        </div>

        <div className="dashboard-card p-4">
          <h2 className="mb-3 text-sm font-bold">{t("editProfile")}</h2>
          <ProfileForm initialName={displayName} />
        </div>

        <div className="dashboard-card p-4">
          <h2 className="mb-3 text-sm font-bold">{t("brandProfile")}</h2>
          <BrandProfileForm initialProfile={brandProfile} />
        </div>

        <div className="dashboard-card p-3">
          <h2 className="mb-2 px-1 text-sm font-bold">{t("settings")}</h2>
          <div className="flex flex-col gap-1.5">
            <LanguageSelector />
            <MenuRow
              href="/privacy"
              label={tDashboard("privacyPolicy")}
            />
            <MenuRow
              href="/terms"
              label={tDashboard("termsOfService")}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 pb-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <SignOutButton />
            <DeleteAccountButton />
          </div>
        </div>
      </div>
    </div>
  );
}
