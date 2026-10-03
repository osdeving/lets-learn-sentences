import { useCallback, useEffect, useMemo, useState } from "react";
import { readStoredNumber, STORAGE } from "../lib/storage";

function voiceScore(voice: SpeechSynthesisVoice): number {
  let score = 0;
  if (/^en-US$/i.test(voice.lang)) score += 50;
  if (/natural|neural|premium|enhanced/i.test(voice.name)) score += 35;
  if (/google us english|aria|jenny|ava|samantha|allison|zoe/i.test(voice.name)) score += 25;
  if (!voice.localService) score += 5;
  if (voice.default) score += 3;
  return score;
}

export interface SpeechController {
  supported: boolean;
  voices: SpeechSynthesisVoice[];
  voiceURI: string;
  setVoiceURI: (value: string) => void;
  rate: number;
  setRate: (value: number) => void;
  speak: (text: string, alternate?: boolean) => void;
  speakAtRate: (text: string, customRate: number, alternate?: boolean) => void;
  speakSequence: (lines: string[]) => void;
  cancel: () => void;
}

export function useSpeech(): SpeechController {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURIState] = useState(() => localStorage.getItem(STORAGE.voice) ?? "");
  const [rate, setRateState] = useState(() => readStoredNumber(STORAGE.rate, 1));

  useEffect(() => {
    if (!supported) return undefined;
    const load = () => {
      const available = window.speechSynthesis
        .getVoices()
        .filter((voice) => /^en([-_]|$)/i.test(voice.lang))
        .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
      setVoices(available);
      setVoiceURIState((current) =>
        current && available.some((voice) => voice.voiceURI === current)
          ? current
          : (available[0]?.voiceURI ?? ""),
      );
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [supported]);

  const selectedVoice = useMemo(
    () => voices.find((voice) => voice.voiceURI === voiceURI) ?? voices[0],
    [voiceURI, voices],
  );

  const alternateVoice = useMemo(
    () => voices.find((voice) => voice.voiceURI !== selectedVoice?.voiceURI) ?? selectedVoice,
    [selectedVoice, voices],
  );

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  const createUtterance = useCallback(
    (text: string, alternate = false) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = rate;
      utterance.pitch = 1;
      const voice = alternate ? alternateVoice : selectedVoice;
      if (voice) utterance.voice = voice;
      return utterance;
    },
    [alternateVoice, rate, selectedVoice],
  );

  const speak = useCallback(
    (text: string, alternate = false) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(createUtterance(text, alternate));
    },
    [createUtterance, supported],
  );

  const speakAtRate = useCallback(
    (text: string, customRate: number, alternate = false) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const utterance = createUtterance(text, alternate);
      utterance.rate = customRate;
      window.speechSynthesis.speak(utterance);
    },
    [createUtterance, supported],
  );

  const speakSequence = useCallback(
    (lines: string[]) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      lines.forEach((line, index) => {
        const utterance = createUtterance(line, index % 2 === 1);
        utterance.rate = Math.min(rate, 1.05);
        window.speechSynthesis.speak(utterance);
      });
    },
    [createUtterance, rate, supported],
  );

  const setVoiceURI = useCallback((value: string) => {
    setVoiceURIState(value);
    localStorage.setItem(STORAGE.voice, value);
  }, []);

  const setRate = useCallback((value: number) => {
    setRateState(value);
    localStorage.setItem(STORAGE.rate, String(value));
  }, []);

  useEffect(() => cancel, [cancel]);

  return { supported, voices, voiceURI, setVoiceURI, rate, setRate, speak, speakAtRate, speakSequence, cancel };
}
