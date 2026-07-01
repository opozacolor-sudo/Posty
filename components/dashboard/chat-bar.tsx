"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ChatAttachment } from "@/lib/chat-upload";
import { uploadChatAttachmentFromBrowser } from "@/lib/chat-upload-client";
import { createClient } from "@/lib/supabase";
import { userWantsImageGeneration } from "@/lib/higgsfield-intent";
import { shouldAttemptPublish } from "@/lib/publish-intent";
import {
  useSpeechInput,
  type SpeechInputError,
} from "@/hooks/use-speech-input";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  attachments?: ChatAttachment[];
};

type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
};

function uploadErrorMessage(code: string | undefined, t: (key: string) => string): string {
  if (code === "unsupported_type") return t("uploadUnsupported");
  if (code === "blob_not_configured") return t("uploadBlobNotConfigured");
  if (code === "storage_bucket_limit") return t("uploadStorageLimit");
  if (code === "image_too_large" || code === "video_too_large") {
    return t("uploadTooLarge");
  }
  return t("uploadFailed");
}

export function ChatBar({
  onScheduleCreated,
}: {
  onScheduleCreated?: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("chatWelcome"),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"thinking" | "image" | "publish">(
    "thinking",
  );
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [chatModeNotice, setChatModeNotice] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLoadingRef = useRef(false);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, pendingAttachment]);

  const buildHistory = useCallback((nextMessages: ChatMessage[]): ChatHistoryItem[] => {
    return nextMessages
      .filter((message) => message.id !== "welcome")
      .map((message) => ({
        role: message.role,
        content: message.content,
        attachments: message.attachments,
        ...(message.imageUrl
          ? {
              content: `${message.content}\n[Posty generated image: ${message.imageUrl}]`.trim(),
            }
          : {}),
      }));
  }, []);

  const fetchReply = useCallback(
    async (history: ChatHistoryItem[]): Promise<{ text: string; imageUrl?: string }> => {
      if (history.length === 0) {
        return { text: t("chatError") };
      }

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          redirect: "manual",
          body: JSON.stringify({ messages: history, locale }),
        });

        if (response.type === "opaqueredirect" || response.status === 307 || response.status === 302) {
          return { text: t("chatSessionExpired") };
        }

        if (response.status === 401) {
          return { text: t("chatSessionExpired") };
        }

        let data: {
          reply?: string;
          error?: string;
          source?: "claude" | "mock" | "error";
          configured?: boolean;
          generatedImageUrl?: string;
          scheduledPost?: { id: string };
          scheduleSaveFailed?: boolean;
          publishResults?: Array<{
            platform: string;
            success: boolean;
            error?: string;
            skipped?: boolean;
          }>;
          publishFailed?: boolean;
          publishSummary?: string;
        };

        try {
          data = (await response.json()) as typeof data;
        } catch {
          return { text: t("chatError") };
        }

        if (data.source === "mock" && data.configured === false) {
          setChatModeNotice(t("chatNotConfigured"));
        } else if (data.source === "claude") {
          setChatModeNotice(null);
        }

        if (response.ok && data.reply) {
          if (data.scheduledPost) {
            onScheduleCreated?.();
          } else if (data.scheduleSaveFailed) {
            setChatModeNotice(t("scheduleFailed"));
          } else if (data.publishResults?.some((result) => result.success)) {
            setChatModeNotice(t("publishPartial"));
          } else if (data.publishFailed) {
            setChatModeNotice(t("publishFailed"));
          }

          return {
            text: data.reply,
            imageUrl: data.generatedImageUrl,
          };
        }

        if (data.source === "mock" && data.reply) {
          return { text: data.reply };
        }
      } catch {
        // Network failure — show translated error below.
      }

      return { text: t("chatError") };
    },
    [locale, onScheduleCreated, t],
  );

  const sendMessage = useCallback(
    async (text: string, attachment?: ChatAttachment | null) => {
      const trimmed = text.trim();
      const activeAttachment = attachment ?? pendingAttachment;

      if ((!trimmed && !activeAttachment) || isLoadingRef.current || isUploading) {
        return;
      }

      isLoadingRef.current = true;
      setIsLoading(true);
      setVoiceNotice(null);
      setInput("");
      setPendingAttachment(null);

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed || activeAttachment?.name || "",
        attachments: activeAttachment ? [activeAttachment] : undefined,
      };

      const nextMessages = [...messagesRef.current, userMessage];
      const history = buildHistory(nextMessages);

      const historyText = history.map((message) => message.content).join("\n");
      const mayPublish = shouldAttemptPublish(trimmed, history);
      const mayGenerateImage =
        !mayPublish &&
        !/\bvideo|mp4|youtube|tiktok\b/i.test(historyText) &&
        (userWantsImageGeneration(trimmed) ||
          userWantsImageGeneration(historyText) ||
          /instagram|ig/i.test(historyText));

      setLoadingMode(
        mayPublish ? "publish" : mayGenerateImage ? "image" : "thinking",
      );
      setMessages(nextMessages);

      const reply = await fetchReply(history);

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: reply.text,
          imageUrl: reply.imageUrl,
        },
      ]);

      isLoadingRef.current = false;
      setIsLoading(false);
    },
    [buildHistory, fetchReply, isUploading, pendingAttachment],
  );

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file || isLoadingRef.current || isUploading) {
        return;
      }

      setIsUploading(true);
      setVoiceNotice(t("uploadingMedia"));

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setVoiceNotice(t("chatSessionExpired"));
          return;
        }

        const attachment = await uploadChatAttachmentFromBrowser(
          supabase,
          user.id,
          file,
        );

        setPendingAttachment(attachment);
        setVoiceNotice(null);
      } catch (error) {
        const code = error instanceof Error ? error.message : undefined;
        setVoiceNotice(uploadErrorMessage(code, t));
      } finally {
        setIsUploading(false);
      }
    },
    [isUploading, t],
  );

  const handleVoiceError = useCallback(
    (error: SpeechInputError) => {
      const keyMap: Record<SpeechInputError, string> = {
        not_supported: "voiceNotSupported",
        permission_denied: "voicePermissionDenied",
        no_speech: "voiceNoSpeech",
        network: "voiceNetworkError",
        transcribe_failed: "voiceTranscribeFailed",
        unknown: "voiceError",
      };

      setVoiceNotice(t(keyMap[error]));
    },
    [t],
  );

  const { isListening, mode, toggleListening } = useSpeechInput({
    onInterim: (text) => {
      setInput(text);
      setVoiceNotice(t("voiceListening"));
    },
    onTranscript: (text) => {
      setInput(text);
      void sendMessage(text, pendingAttachment);
    },
    onError: handleVoiceError,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendMessage(input, pendingAttachment);
  }

  const canSend =
    (input.trim().length > 0 || pendingAttachment !== null) &&
    !isLoading &&
    !isListening &&
    !isUploading;

  return (
    <div className="chat-panel flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-white px-3 py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-coral">
          <svg
            className="h-3.5 w-3.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <div>
          <p className="text-xs font-bold leading-tight">{t("assistantName")}</p>
          <p className="text-[10px] text-green">
            {isUploading
              ? t("uploadingMedia")
              : isLoading
                ? loadingMode === "publish"
                  ? t("chatPublishing")
                  : loadingMode === "image"
                    ? t("chatGeneratingImage")
                    : t("chatThinking")
                : isListening
                  ? t("voiceListening")
                  : t("chatOnline")}
          </p>
          {chatModeNotice && (
            <p className="text-[10px] text-muted-foreground">{chatModeNotice}</p>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white px-3 py-2">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3 py-1.5 text-xs leading-relaxed md:text-[13px] ${
                  message.role === "user"
                    ? "bg-coral font-medium text-white"
                    : "bg-card text-foreground"
                }`}
              >
                {message.content}
                {message.attachments?.map((attachment) =>
                  attachment.mediaType.startsWith("image/") ? (
                    <div key={attachment.url} className="mt-2">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">
                        {t("attachedPhoto")}
                      </p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="max-h-56 w-full rounded-xl object-cover"
                      />
                    </div>
                  ) : (
                    <p key={attachment.url} className="mt-2 text-[10px] opacity-90">
                      {t("attachedVideo")}: {attachment.name}
                    </p>
                  ),
                )}
                {message.imageUrl && (
                  <div className="mt-2">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Imagine generată
                    </p>
                    <a
                      href={message.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-xl border border-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={message.imageUrl}
                        alt=""
                        className="max-h-56 w-full object-cover"
                      />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-card px-3 py-1.5 text-xs text-muted-foreground">
                {loadingMode === "publish"
                  ? t("chatPublishing")
                  : loadingMode === "image"
                    ? t("chatGeneratingImage")
                    : t("chatThinking")}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-border bg-white px-3 py-2"
      >
        {voiceNotice && (
          <p
            className={`mx-auto mb-2 max-w-3xl text-center text-[11px] ${
              isListening || isUploading ? "font-medium text-coral" : "text-muted-foreground"
            }`}
          >
            {voiceNotice}
            {isListening && mode === "recording" ? ` · ${t("voiceTapToStop")}` : null}
          </p>
        )}

        {pendingAttachment && (
          <div className="mx-auto mb-2 flex max-w-3xl items-center gap-2 rounded-xl border border-border bg-card p-2">
            {pendingAttachment.mediaType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pendingAttachment.url}
                alt={pendingAttachment.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-[10px] font-semibold">
                MP4
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold">{pendingAttachment.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {pendingAttachment.mediaType.startsWith("image/")
                  ? t("attachedPhoto")
                  : t("attachedVideo")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPendingAttachment(null)}
              className="rounded-full px-2 py-1 text-[10px] text-muted-foreground hover:bg-white"
              aria-label={t("removeAttachment")}
            >
              ✕
            </button>
          </div>
        )}

        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isListening || isUploading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-foreground hover:bg-border disabled:opacity-60"
            aria-label={t("attachMedia")}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening ? t("voiceListeningPlaceholder") : t("chatPlaceholder")
            }
            disabled={isLoading || isUploading}
            className="input-field flex-1 rounded-full px-4 py-2.5 text-sm disabled:opacity-60"
          />

          <button
            type="button"
            onClick={toggleListening}
            disabled={isLoading || isUploading}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-60 ${
              isListening
                ? "animate-pulse bg-coral text-white"
                : "bg-card text-foreground hover:bg-border"
            }`}
            aria-label={isListening ? t("voiceStop") : t("voiceInput")}
            aria-pressed={isListening}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </button>

          <button
            type="submit"
            disabled={!canSend}
            className="btn-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0 disabled:opacity-60"
            aria-label={t("send")}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </form>

      <footer className="shrink-0 border-t border-border bg-white px-3 py-2 text-center text-[10px] leading-relaxed text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground">
          {t("privacyPolicy")}
        </Link>
        <span className="mx-1.5">·</span>
        <Link href="/terms" className="hover:text-foreground">
          {t("termsOfService")}
        </Link>
        <span className="mx-1.5">·</span>
        <span>{t("copyright")}</span>
      </footer>
    </div>
  );
}
