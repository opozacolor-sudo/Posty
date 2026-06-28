"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase";

type ProfileFormProps = {
  initialName: string;
};

export function ProfileForm({ initialName }: ProfileFormProps) {
  const t = useTranslations("profile");
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name.trim() },
      });

      if (error) {
        setMessage({ type: "error", text: t("saveError") });
        return;
      }

      setMessage({ type: "success", text: t("saveSuccess") });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: t("saveError") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="fullName" className="mb-1 block text-xs font-medium">
          {t("fullName")}
        </label>
        <input
          id="fullName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("fullNamePlaceholder")}
          className="input-field py-2.5 text-sm"
          autoComplete="name"
        />
      </div>

      {message && (
        <p
          className={`rounded-xl px-3 py-2 text-xs font-medium ${
            message.type === "success"
              ? "bg-green/10 text-green"
              : "bg-coral/10 text-coral"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="btn-primary w-full py-2.5 text-sm"
      >
        {loading ? t("saving") : t("save")}
      </button>
    </form>
  );
}
