"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase";
import {
  type BrandProfile,
  VOICE_TONES,
} from "@/lib/brand-profile";
import { locales, type Locale } from "@/i18n/routing";
import { TagsInput } from "./tags-input";

type BrandProfileFormProps = {
  initialProfile: BrandProfile;
};

export function BrandProfileForm({ initialProfile }: BrandProfileFormProps) {
  const t = useTranslations("profile");
  const tLanguage = useTranslations("language");
  const router = useRouter();

  const [profile, setProfile] = useState<BrandProfile>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function updateField<K extends keyof BrandProfile>(
    key: K,
    value: BrandProfile[K],
  ) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { brand_profile: profile },
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
        <label htmlFor="brandNiche" className="mb-1 block text-xs font-medium">
          {t("brandNiche")}
        </label>
        <input
          id="brandNiche"
          type="text"
          value={profile.niche}
          onChange={(e) => updateField("niche", e.target.value)}
          placeholder={t("brandNichePlaceholder")}
          className="input-field py-2.5 text-sm"
        />
      </div>

      <div>
        <label htmlFor="voiceTone" className="mb-1 block text-xs font-medium">
          {t("voiceTone")}
        </label>
        <select
          id="voiceTone"
          value={profile.voice_tone}
          onChange={(e) =>
            updateField("voice_tone", e.target.value as BrandProfile["voice_tone"])
          }
          className="input-field py-2.5 text-sm"
        >
          {VOICE_TONES.map((tone) => (
            <option key={tone} value={tone}>
              {t(`voiceTone${tone.charAt(0).toUpperCase()}${tone.slice(1)}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="targetAudience"
          className="mb-1 block text-xs font-medium"
        >
          {t("targetAudience")}
        </label>
        <input
          id="targetAudience"
          type="text"
          value={profile.target_audience}
          onChange={(e) => updateField("target_audience", e.target.value)}
          placeholder={t("targetAudiencePlaceholder")}
          className="input-field py-2.5 text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="aiContentLanguage"
          className="mb-1 block text-xs font-medium"
        >
          {t("aiContentLanguage")}
        </label>
        <select
          id="aiContentLanguage"
          value={profile.ai_content_language}
          onChange={(e) => updateField("ai_content_language", e.target.value)}
          className="input-field py-2.5 text-sm"
        >
          {locales.map((code) => (
            <option key={code} value={code}>
              {tLanguage(code as Locale)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="favoriteHashtags"
          className="mb-1 block text-xs font-medium"
        >
          {t("favoriteHashtags")}
        </label>
        <TagsInput
          id="favoriteHashtags"
          value={profile.favorite_hashtags}
          onChange={(tags) => updateField("favorite_hashtags", tags)}
          placeholder={t("hashtagPlaceholder")}
        />
      </div>

      <div>
        <label htmlFor="claudeNote" className="mb-1 block text-xs font-medium">
          {t("claudeNote")}
        </label>
        <textarea
          id="claudeNote"
          value={profile.claude_note}
          onChange={(e) => updateField("claude_note", e.target.value)}
          placeholder={t("claudeNotePlaceholder")}
          rows={4}
          className="input-field resize-none py-2.5 text-sm"
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
        disabled={loading}
        className="btn-primary w-full py-2.5 text-sm"
      >
        {loading ? t("saving") : t("saveBrandProfile")}
      </button>
    </form>
  );
}
