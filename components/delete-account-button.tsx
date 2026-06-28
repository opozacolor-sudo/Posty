"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase";

export function DeleteAccountButton() {
  const t = useTranslations("profile");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? t("deleteAccountError"));
        return;
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setError(t("deleteAccountError"));
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-coral/20 bg-coral/5 p-4 text-center">
        <p className="text-sm font-bold text-foreground">
          {t("deleteAccountConfirmTitle")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("deleteAccountConfirmMessage")}
        </p>
        {error && (
          <p className="mt-2 text-xs font-medium text-coral">{error}</p>
        )}
        <div className="mt-3 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={loading}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            {t("deleteAccountCancel")}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="rounded-full bg-coral px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? t("deleting") : t("deleteAccountConfirmButton")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-full border border-coral/30 px-4 py-2 text-sm font-medium text-coral transition-colors hover:bg-coral/5"
    >
      {t("deleteAccount")}
    </button>
  );
}
