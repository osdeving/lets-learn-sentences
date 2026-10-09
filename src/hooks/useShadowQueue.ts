import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeShadowSettings, SHADOW_PROMPT_PATH, shadowPauseSeconds, type ShadowSettings } from "../lib/shadow";
import { useClipPlayer } from "./useClipPlayer";
import type { ListeningItem } from "./useListeningQueue";

export type ShadowPhase = "idle" | "listen" | "prompt" | "repeat";

function savedSettings(storageKey: string) {
  try { return normalizeShadowSettings(JSON.parse(localStorage.getItem(storageKey) ?? "{}")); }
  catch { return normalizeShadowSettings({}); }
}

export function useShadowQueue(items: ListeningItem[], storageKey: string, onItem?: (index: number) => void) {
  const player = useClipPlayer();
  const [settings, setSettings] = useState<ShadowSettings>(() => savedSettings(storageKey));
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<ShadowPhase>("idle");
  const [remaining, setRemaining] = useState(0);
  const [repetition, setRepetition] = useState(0);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const serial = useRef(0);
  const timer = useRef(0);
  const savedKey = useRef(storageKey);
  const latest = useRef({ items, settings, onItem });
  latest.current = { items, settings, onItem };

  const stop = useCallback(() => {
    serial.current++;
    window.clearTimeout(timer.current);
    player.stop();
    setRunning(false);
    setPhase("idle");
    setRemaining(0);
  }, [player.stop]);

  useEffect(() => { stop(); }, [items, settings, stop]);
  useEffect(() => {
    if (savedKey.current === storageKey) return;
    stop();
    savedKey.current = storageKey;
    setSettings(savedSettings(storageKey));
  }, [storageKey, stop]);
  useEffect(() => {
    window.addEventListener("pagehide", stop);
    window.addEventListener("popstate", stop);
    window.addEventListener("hashchange", stop);
    return () => {
      window.removeEventListener("pagehide", stop);
      window.removeEventListener("popstate", stop);
      window.removeEventListener("hashchange", stop);
      stop();
    };
  }, [stop]);
  useEffect(() => {
    if (!player.error) return;
    stop();
    setError(player.error);
  }, [player.error, stop]);

  const configure = useCallback((next: Partial<ShadowSettings>) => {
    stop();
    const config = normalizeShadowSettings({ ...latest.current.settings, ...next });
    latest.current.settings = config;
    setSettings(config);
    try { localStorage.setItem(storageKey, JSON.stringify(config)); } catch { /* Playback also works when storage is unavailable. */ }
  }, [storageKey, stop]);

  const start = useCallback((from = 0) => {
    stop();
    setError("");
    const token = serial.current;
    const list = latest.current.items;
    const config = normalizeShadowSettings(latest.current.settings);
    if (!list.length) return;
    setRunning(true);
    const active = () => serial.current === token;
    const finish = () => {
      if (!active()) return;
      setRunning(false);
      setPhase("idle");
      setRemaining(0);
    };
    const repeatPause = (itemIndex: number) => {
      if (!active()) return;
      setPhase("repeat");
      const seconds = shadowPauseSeconds(list[itemIndex], config);
      const deadline = Date.now() + seconds * 1000;
      const tick = () => {
        if (!active()) return;
        const milliseconds = Math.max(0, deadline - Date.now());
        setRemaining(Math.ceil(milliseconds / 100) / 10);
        if (milliseconds > 0) timer.current = window.setTimeout(tick, Math.min(100, milliseconds));
        else {
          const next = itemIndex + 1 < list.length ? itemIndex + 1 : config.loop ? 0 : -1;
          if (config.continuous && next >= 0) listen(next, 0);
          else finish();
        }
      };
      tick();
    };
    const prompt = (itemIndex: number) => {
      if (!active()) return;
      setPhase("prompt");
      void player.play(SHADOW_PROMPT_PATH, 0, Number.MAX_SAFE_INTEGER, { rate: 1, onComplete: () => repeatPause(itemIndex) });
    };
    const listen = (itemIndex: number, pass: number) => {
      if (!active()) return;
      const item = list[itemIndex];
      if (!item.audioUrl) {
        stop();
        setError("Este trecho não tem um áudio para praticar shadowing.");
        return;
      }
      setIndex(itemIndex);
      setRepetition(pass + 1);
      setRemaining(0);
      setPhase("listen");
      if (pass === 0) latest.current.onItem?.(itemIndex);
      let completed = false;
      void player.play(item.audioUrl, item.start ?? 0, item.end ?? Number.MAX_SAFE_INTEGER, {
        rate: item.rate ?? 1,
        onComplete: () => {
          if (completed || !active()) return;
          completed = true;
          if (pass + 1 < config.repeats) timer.current = window.setTimeout(() => listen(itemIndex, pass + 1), config.gap);
          else prompt(itemIndex);
        },
      });
    };
    const first = Number.isFinite(from) ? Math.max(0, Math.min(Math.trunc(from), list.length - 1)) : 0;
    listen(first, 0);
  }, [player.play, stop]);

  return { settings, configure, running, phase, remaining, repetition, index, error, position: player.position, start, stop };
}
