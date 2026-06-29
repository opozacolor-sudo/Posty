"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import {
  isBrowserSpeechRecognitionSupported,
  resolveSpeechRecognitionLang,
} from "@/lib/speech-locale";

export type SpeechInputError =
  | "not_supported"
  | "permission_denied"
  | "no_speech"
  | "network"
  | "transcribe_failed"
  | "unknown";

type UseSpeechInputOptions = {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (error: SpeechInputError) => void;
};

export function useSpeechInput({
  onTranscript,
  onInterim,
  onError,
}: UseSpeechInputOptions) {
  const locale = useLocale();
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<"browser" | "recording" | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    setIsListening(false);
    setMode(null);
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
      stopMediaStream();
    };
  }, [stopListening, stopMediaStream]);

  const transcribeRecording = useCallback(
    async (blob: Blob) => {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("locale", locale);

      const response = await fetch("/api/chat/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        text?: string;
        error?: string;
      };

      if (!response.ok || !data.text?.trim()) {
        onError?.("transcribe_failed");
        return;
      }

      onTranscript(data.text.trim());
    },
    [locale, onError, onTranscript],
  );

  const startRecordingFallback = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onError?.("not_supported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        stopMediaStream();
        setIsListening(false);
        setMode(null);
        void transcribeRecording(blob);
      };

      recorder.onerror = () => {
        stopMediaStream();
        setIsListening(false);
        setMode(null);
        onError?.("unknown");
      };

      mediaRecorderRef.current = recorder;
      setMode("recording");
      setIsListening(true);
      recorder.start();
    } catch {
      stopMediaStream();
      onError?.("permission_denied");
    }
  }, [onError, stopMediaStream, transcribeRecording]);

  const startBrowserRecognition = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      void startRecordingFallback();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = resolveSpeechRecognitionLang(
      locale,
      document.documentElement.lang,
    );
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setMode("browser");
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      setMode(null);
      recognitionRef.current = null;
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setMode(null);
      recognitionRef.current = null;

      if (event.error === "not-allowed") {
        onError?.("permission_denied");
        return;
      }
      if (event.error === "no-speech") {
        onError?.("no_speech");
        return;
      }
      if (event.error === "network") {
        onError?.("network");
        return;
      }
      onError?.("unknown");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        onInterim?.(interim.trim());
      }

      if (finalText.trim()) {
        onTranscript(finalText.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [locale, onError, onInterim, onTranscript, startRecordingFallback]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }

    if (isBrowserSpeechRecognitionSupported()) {
      startBrowserRecognition();
      return;
    }

    void startRecordingFallback();
  }, [isListening, startBrowserRecognition, startRecordingFallback, stopListening]);

  return {
    isListening,
    mode,
    toggleListening,
    stopListening,
    supportsBrowserSpeech: isBrowserSpeechRecognitionSupported(),
  };
}
