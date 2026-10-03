import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeechController } from "./useSpeech";
import { useClipPlayer } from "./useClipPlayer";

export interface ListeningItem { id: string; text: string; audioUrl?: string | null; start?: number; end?: number; alternate?: boolean; rate?: number }
export interface QueueSettings { repeats: number; gap: number; continuous: boolean; loop: boolean }
const defaults: QueueSettings = { repeats: 3, gap: 500, continuous: true, loop: false };

export function useListeningQueue(items: ListeningItem[], storageKey: string, speech?: SpeechController, onItem?: (index: number) => void, onHeard?: (id: string) => void) {
  const player = useClipPlayer();
  const [settings, setSettings] = useState<QueueSettings>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
      return { repeats: Number.isInteger(v.repeats) && v.repeats >= 1 && v.repeats <= 20 ? v.repeats : 3,
        gap: Number.isFinite(v.gap) && v.gap >= 0 && v.gap <= 10000 ? v.gap : 500,
        continuous: typeof v.continuous === "boolean" ? v.continuous : true, loop: v.loop === true };
    } catch { return defaults; }
  });
  const [running, setRunning] = useState(false);
  const [repetition, setRepetition] = useState(0);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const token = useRef(0);
  const timer = useRef(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const latest = useRef({ items, settings, speech, onItem, onHeard });
  latest.current = { items, settings, speech, onItem, onHeard };
  const stop = useCallback(() => {
    token.current++;
    window.clearTimeout(timer.current);
    player.stop();
    if (utteranceRef.current) {
      utteranceRef.current.onend = null; utteranceRef.current.onerror = null;
      window.speechSynthesis.cancel(); utteranceRef.current = null;
    }
    setRunning(false);
  }, [player.stop]);
  useEffect(() => { stop(); }, [items, stop]);
  useEffect(() => () => { stop(); }, [stop]);
  useEffect(() => { if (player.error) { stop(); setError(player.error); } }, [player.error, stop]);

  const start = (from = 0, single = false) => {
    stop(); setError("");
    const serial = token.current;
    const { items: list, settings: config } = latest.current;
    if (!list.length) return;
    setRunning(true);
    const run = (itemIndex: number, pass: number) => {
      if (serial !== token.current) return;
      const item = list[itemIndex];
      setIndex(itemIndex); setRepetition(pass + 1);
      if (pass === 0) latest.current.onItem?.(itemIndex);
      let completed = false;
      const finish = () => {
        if (completed || serial !== token.current) return;
        completed = true;
        const again = !single && pass + 1 < config.repeats;
        if (!again) latest.current.onHeard?.(item.id);
        const next = itemIndex + 1 < list.length ? itemIndex + 1 : config.loop ? 0 : -1;
        if (again) timer.current = window.setTimeout(() => run(itemIndex, pass + 1), config.gap);
        else if (!single && config.continuous && next >= 0) timer.current = window.setTimeout(() => run(next, 0), config.gap);
        else setRunning(false);
      };
      if (item.audioUrl) {
        void player.play(item.audioUrl, item.start ?? 0, item.end ?? Number.MAX_SAFE_INTEGER, { rate: item.rate ?? latest.current.speech?.rate ?? 1, onComplete: finish });
      } else if ("speechSynthesis" in window) {
        const voice = latest.current.speech;
        const utterance = new SpeechSynthesisUtterance(item.text);
        utteranceRef.current = utterance;
        utterance.lang = "en-US"; utterance.rate = item.rate ?? voice?.rate ?? 1;
        const selected = voice?.voices.find(v => v.voiceURI === voice.voiceURI);
        const alternate = voice?.voices.find(v => v.voiceURI !== selected?.voiceURI);
        if (item.alternate && alternate) utterance.voice = alternate;
        else if (selected) utterance.voice = selected;
        utterance.onend = finish;
        utterance.onerror = event => {
          if (serial !== token.current || event.error === "canceled" || event.error === "interrupted") return;
          stop(); setError("A voz do navegador não iniciou. Escolha outra voz e tente novamente.");
        };
        window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance);
      } else { stop(); setError("Este navegador não oferece voz para esta sentença."); }
    };
    run(Math.max(0, Math.min(from, list.length - 1)), 0);
  };
  const configure = (next: QueueSettings) => {
    stop(); setSettings(next); localStorage.setItem(storageKey, JSON.stringify(next));
  };
  return { settings, configure, running, repetition, index, error, start, stop, position: player.position };
}
