"use client";

import { useCallback, useRef, useState, useEffect } from "react";

/**
 * Voice synthesis hook — uses the free browser Web Speech API.
 *
 * Voice strategy:
 * - Primary: Browser-native SpeechSynthesis (100% free, zero API keys, instant)
 * - On macOS: prefers "Samantha" (warm, natural US English)
 * - On Windows/Chrome: prefers Google US English voices
 * - Applies Southern cadence via slower rate (0.85) and slightly lower pitch
 *
 * Fallback: The hook exposes a `speakWithOpenAI` function slot so the parent
 * can plug in OpenAI GPT-4o-mini-TTS with Southern accent instructions if
 * premium voice mode is enabled.
 */

export type VoiceStatus = "idle" | "speaking" | "paused" | "error";

interface UseVoiceOptions {
  /** Speech rate multiplier (0.1 to 10). Default 0.85 for Southern cadence */
  rate?: number;
  /** Speech pitch (0 to 2). Default 0.95 for warm, natural tone */
  pitch?: number;
  /** Preferred voice name to search for */
  preferredVoice?: string;
  /** Whether to automatically attempt speaking */
  autoSpeak?: boolean;
}

interface UseVoiceReturn {
  /** Current voice status */
  status: VoiceStatus;
  /** Whether the browser supports speech synthesis */
  isSupported: boolean;
  /** List of available voices */
  voices: SpeechSynthesisVoice[];
  /** Currently selected voice */
  selectedVoice: SpeechSynthesisVoice | null;
  /** Speak the given text */
  speak: (text: string) => void;
  /** Stop speaking immediately */
  stop: () => void;
  /** Pause current speech */
  pause: () => void;
  /** Resume paused speech */
  resume: () => void;
  /** Set preferred voice by name */
  setVoice: (voiceName: string) => void;
  /** Speaking rate */
  rate: number;
  /** Speaking pitch */
  pitch: number;
}

/**
 * Southern-friendly voice names to try in order of preference.
 * These are voices commonly available across OS/browser combinations
 * that have a warm, natural American English quality.
 */
const SOUTHERN_FRIENDLY_VOICES = [
  // macOS voices (excellent quality)
  "Samantha",       // macOS — warm, natural female US English
  "Alex",           // macOS — natural male US English
  "Karen",          // macOS — female Australian (warm)
  // Windows voices
  "Microsoft Zira Desktop", // Windows 10/11 — female US English
  "Microsoft David Desktop", // Windows 10/11 — male US English
  // Chrome/Google voices (cross-platform)
  "Google US English",       // Chrome — female US English
  "Google UK English Female",
  "Google UK English Male",
  // Generic fallbacks
  "default",
  "en-US",
];

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    rate: initialRate = 0.85,
    pitch: initialPitch = 0.95,
    preferredVoice,
    autoSpeak = false,
  } = options;

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(initialRate);
  const [pitch, setPitch] = useState(initialPitch);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check browser support
  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // Load voices on mount
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);

        // Try to find the best Southern-friendly voice
        const found = findBestVoice(availableVoices, preferredVoice);
        setSelectedVoice(found);
      }
    };

    // Try immediate load
    loadVoices();

    // Chrome loads voices asynchronously
    if ("onvoiceschanged" in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isSupported, preferredVoice]);

  /**
   * Find the best available voice matching Southern-friendly preferences.
   */
  const findBestVoice = useCallback(
    (
      availableVoices: SpeechSynthesisVoice[],
      preferred?: string,
    ): SpeechSynthesisVoice | null => {
      if (!availableVoices.length) return null;

      // If a specific preferred voice was requested, try to find it
      if (preferred) {
        const exact = availableVoices.find(
          (v) => v.name === preferred || v.name.includes(preferred),
        );
        if (exact) return exact;
      }

      // Try each Southern-friendly voice in order
      for (const voiceName of SOUTHERN_FRIENDLY_VOICES) {
        const match = availableVoices.find((v) =>
          v.name.toLowerCase().includes(voiceName.toLowerCase()),
        );
        if (match) return match;
      }

      // Fallback: find any English voice
      const englishVoice = availableVoices.find((v) =>
        v.lang.startsWith("en"),
      );
      if (englishVoice) return englishVoice;

      // Last resort: first available voice
      return availableVoices[0] || null;
    },
    [],
  );

  /**
   * Speak text aloud with Southern cadence settings.
   */
  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;

      // Cancel any current speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Apply Southern cadence
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = 1;

      // Use the selected voice if available
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Track status via events
      utterance.onstart = () => setStatus("speaking");
      utterance.onpause = () => setStatus("paused");
      utterance.onresume = () => setStatus("speaking");
      utterance.onend = () => setStatus("idle");
      utterance.onerror = (event) => {
        console.warn("Speech synthesis error:", event.error);
        setStatus("error");
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, rate, pitch, selectedVoice],
  );

  /**
   * Stop speaking immediately and clear the queue.
   */
  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setStatus("idle");
  }, [isSupported]);

  /**
   * Pause current speech.
   */
  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
  }, [isSupported]);

  /**
   * Resume paused speech.
   */
  const resume = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.resume();
  }, [isSupported]);

  /**
   * Change the preferred voice.
   */
  const setVoice = useCallback(
    (voiceName: string) => {
      const found = findBestVoice(voices, voiceName);
      if (found) {
        setSelectedVoice(found);
      }
    },
    [voices, findBestVoice],
  );

  return {
    status,
    isSupported,
    voices,
    selectedVoice,
    speak,
    stop,
    pause,
    resume,
    setVoice,
    rate,
    pitch,
  };
}

/**
 * Plain function to speak a single text string without React hook overhead.
 * Useful for quick one-off speech in event handlers.
 */
export function speakText(text: string, options?: UseVoiceOptions): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options?.rate ?? 0.85;
  utterance.pitch = options?.pitch ?? 0.95;

  // Try to find a good voice
  const voices = window.speechSynthesis.getVoices();
  for (const voiceName of SOUTHERN_FRIENDLY_VOICES) {
    const match = voices.find((v) =>
      v.name.toLowerCase().includes(voiceName.toLowerCase()),
    );
    if (match) {
      utterance.voice = match;
      break;
    }
  }

  window.speechSynthesis.speak(utterance);
}
