"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient, isSupabaseReady } from "@/lib/supabase";

type AuthMode = "login" | "signup";

function getAuthErrorMessage(
  error: unknown,
  t: ReturnType<typeof useTranslations<"auth">>,
): string {
  if (error instanceof Error) {
    if (error.message === "SUPABASE_NOT_CONFIGURED") {
      return t("configError");
    }

    const message = error.message.toLowerCase();
    if (
      message.includes("load failed") ||
      message.includes("failed to fetch") ||
      message.includes("network")
    ) {
      return t("networkError");
    }

    if (message.includes("invalid login credentials")) {
      return t("invalidCredentials");
    }

    if (error.message) {
      return error.message;
    }
  }

  return t("genericError");
}

export function AuthForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const supabaseReady = isSupabaseReady();
  const supabase = useMemo(
    () => (supabaseReady ? createClient() : null),
    [supabaseReady],
  );

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    supabaseReady ? null : t("configError"),
  );
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!supabase) {
      setError(t("configError"));
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          setError(getAuthErrorMessage(authError, t));
          return;
        }

        router.push("/dashboard");
        router.refresh();
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?locale=${locale}`,
          },
        });

        if (authError) {
          setError(getAuthErrorMessage(authError, t));
          return;
        }

        if (data.session) {
          router.push("/dashboard");
          router.refresh();
          return;
        }

        setSuccess(t("signupSuccess"));
      }
    } catch (caughtError) {
      setError(getAuthErrorMessage(caughtError, t));
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setMode(mode === "login" ? "signup" : "login");
    setError(supabaseReady ? null : t("configError"));
    setSuccess(null);
    setConfirmPassword("");
  }

  return (
    <div className="card-lg w-full max-w-md p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          {mode === "login" ? t("welcomeBack") : t("createAccount")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="mb-6 flex rounded-full bg-muted p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(supabaseReady ? null : t("configError"));
            setSuccess(null);
          }}
          className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all ${
            mode === "login"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          {t("login")}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(supabaseReady ? null : t("configError"));
            setSuccess(null);
          }}
          className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all ${
            mode === "signup"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          {t("signup")}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className="input-field"
            autoComplete="email"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("password")}
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            className="input-field"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
        </div>

        {mode === "signup" && (
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium"
            >
              {t("confirmPassword")}
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("confirmPasswordPlaceholder")}
              className="input-field"
              autoComplete="new-password"
            />
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-xl bg-green/10 px-4 py-3 text-sm text-green">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !supabaseReady}
          className="btn-primary w-full py-3.5 text-base"
        >
          {loading
            ? tCommon("loading")
            : mode === "login"
              ? t("loginButton")
              : t("signupButton")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "login" ? t("noAccount") : t("hasAccount")}{" "}
        <button
          type="button"
          onClick={toggleMode}
          className="font-semibold text-coral hover:underline"
        >
          {mode === "login" ? t("signup") : t("login")}
        </button>
      </p>
    </div>
  );
}
