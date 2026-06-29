"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  PlatformIcon,
  PLATFORM_COLORS,
} from "@/components/dashboard/platform-icon";
import { PlatformCapabilityBadge } from "@/components/accounts/platform-capability";
import type { ConnectedAccount } from "@/lib/dashboard-data";
import { getPlatformConnectHref, OAUTH_CONNECT_PLATFORMS } from "@/lib/oauth-platforms";
import { canConnectPlatform } from "@/lib/platform-capabilities";
import { createClient } from "@/lib/supabase";

type OnboardingFlowProps = {
  initialName: string;
  accounts: ConnectedAccount[];
};

const STEPS = [1, 2, 3] as const;

export function OnboardingFlow({ initialName, accounts }: OnboardingFlowProps) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<(typeof STEPS)[number]>(1);
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectedCount = useMemo(
    () => accounts.filter((account) => account.connected).length,
    [accounts],
  );

  const oauthAccounts = useMemo(
    () =>
      OAUTH_CONNECT_PLATFORMS.map(
        (platform) =>
          accounts.find((account) => account.platform === platform) ?? {
            platform,
            connected: false,
          },
      ),
    [accounts],
  );

  async function saveName(): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("nameRequired"));
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: trimmed },
      });

      if (updateError) {
        setError(t("saveError"));
        return false;
      }

      router.refresh();
      return true;
    } catch {
      setError(t("saveError"));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function completeOnboarding() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        data: { onboarding_completed: true },
      });

      if (updateError) {
        setError(t("saveError"));
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("saveError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleStepOneContinue() {
    const saved = await saveName();
    if (saved) {
      setStep(2);
    }
  }

  async function handleFinish() {
    if (!name.trim()) {
      const saved = await saveName();
      if (!saved) {
        return;
      }
    }

    await completeOnboarding();
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((value) => (
          <div
            key={value}
            className={`h-2.5 rounded-full transition-all ${
              value === step
                ? "w-10 bg-coral"
                : value < step
                  ? "w-2.5 bg-coral/60"
                  : "w-2.5 bg-muted"
            }`}
          />
        ))}
      </div>

      {step === 1 ? (
        <div className="card-lg p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-coral">
            {t("stepLabel", { current: 1, total: 3 })}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("step1Title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("step1Subtitle")}</p>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="onboarding-name" className="mb-1.5 block text-sm font-medium">
                {t("nameLabel")}
              </label>
              <input
                id="onboarding-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("namePlaceholder")}
                className="input-field"
                autoComplete="name"
              />
            </div>

            {error ? (
              <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">{error}</p>
            ) : null}

            <button
              type="button"
              disabled={loading}
              onClick={handleStepOneContinue}
              className="btn-primary w-full py-3.5 text-base"
            >
              {loading ? t("saving") : t("continue")}
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="card-lg p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-coral">
            {t("stepLabel", { current: 2, total: 3 })}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("step2Title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("step2Subtitle")}</p>

          <p className="mt-4 text-sm font-medium text-foreground">
            {connectedCount > 0
              ? t("connectedCount", { count: connectedCount })
              : t("noneConnectedYet")}
          </p>

          <ul className="mt-4 flex flex-col gap-2">
            {oauthAccounts.map(({ platform, connected, accountName }) => {
              const connectHref = getPlatformConnectHref(platform, locale);

              return (
                <li
                  key={platform}
                  className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-3"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      color: PLATFORM_COLORS[platform],
                      backgroundColor: `${PLATFORM_COLORS[platform]}14`,
                    }}
                  >
                    <PlatformIcon platform={platform} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold capitalize">{platform}</p>
                      <PlatformCapabilityBadge platform={platform} />
                    </div>
                    <p
                      className={`truncate text-sm ${
                        connected ? "text-green" : "text-muted-foreground"
                      }`}
                    >
                      {connected
                        ? accountName ?? t("connected")
                        : t("notConnected")}
                    </p>
                  </div>

                  {connected || !connectHref || !canConnectPlatform(platform) ? null : (
                    <a
                      href={connectHref}
                      className="btn-primary shrink-0 rounded-full px-4 py-2 text-sm font-semibold no-underline"
                    >
                      {t("connect")}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>

          <Link
            href="/accounts"
            className="mt-4 inline-block text-sm font-semibold text-coral hover:underline"
          >
            {t("openAccountsPage")}
          </Link>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => setStep(3)}
              className="btn-primary w-full py-3.5 text-base"
            >
              {connectedCount > 0 ? t("continue") : t("continueWithoutConnect")}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setStep(1)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t("back")}
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="card-lg p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-coral">
            {t("stepLabel", { current: 3, total: 3 })}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("step3Title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("step3Subtitle")}</p>

          <ul className="mt-6 space-y-3 text-sm text-foreground">
            <li className="rounded-xl bg-muted/60 px-4 py-3">{t("examplePostNow")}</li>
            <li className="rounded-xl bg-muted/60 px-4 py-3">{t("exampleSchedule")}</li>
            <li className="rounded-xl bg-muted/60 px-4 py-3">{t("exampleAttach")}</li>
          </ul>

          {error ? (
            <p className="mt-4 rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">{error}</p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={handleFinish}
              className="btn-primary w-full py-3.5 text-base"
            >
              {loading ? t("saving") : t("openDashboard")}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setStep(2)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {t("back")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
