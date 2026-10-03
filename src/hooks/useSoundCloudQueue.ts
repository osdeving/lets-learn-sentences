import { useCallback, useEffect, useRef, useState } from "react";
import type { QueueSettings } from "./useListeningQueue";

interface Widget {
  bind: (event: string, callback: () => void) => void;
  unbind: (event: string) => void;
  load: (url: string, options: { auto_play: boolean; callback: () => void }) => void;
  play: () => void; pause: () => void; seekTo: (position: number) => void;
}
type WidgetFactory = ((iframe: HTMLIFrameElement) => Widget) & { Events: Record<string, string> };
let sdk: Promise<WidgetFactory> | undefined;
function loadWidget() {
  return sdk ??= new Promise<WidgetFactory>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://w.soundcloud.com/player/api.js";
    script.onload = () => resolve((window as unknown as { SC: { Widget: WidgetFactory } }).SC.Widget);
    script.onerror = () => { sdk = undefined; reject(new Error("Player indisponível")); };
    document.head.appendChild(script);
  });
}
const defaults: QueueSettings = { repeats: 3, gap: 500, continuous: true, loop: false };
export function useSoundCloudQueue(urls: string[]) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const widget = useRef<Widget | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [repetition, setRepetition] = useState(0);
  const [settings, setSettings] = useState<QueueSettings>(() => {
    try {
      const v = JSON.parse(localStorage.getItem("ouvir-ingles:source-widget-queue") ?? "{}");
      return { repeats: Number.isInteger(v.repeats) && v.repeats > 0 && v.repeats <= 20 ? v.repeats : 3,
        gap: Number.isFinite(v.gap) && v.gap >= 0 && v.gap <= 10000 ? v.gap : 500,
        continuous: typeof v.continuous === "boolean" ? v.continuous : true, loop: v.loop === true };
    } catch { return defaults; }
  });
  const timer = useRef(0);
  const serial = useRef(0);
  const finish = useRef<() => void>(() => {});
  const stop = useCallback(() => {
    serial.current++;
    window.clearTimeout(timer.current);
    finish.current = () => {};
    widget.current?.pause(); setRunning(false);
  }, []);
  useEffect(() => {
    if (!urls.length || !iframe.current) return;
    let disposed = false;
    let api: WidgetFactory | undefined;
    loadWidget().then(factory => {
      if (disposed || !iframe.current) return;
      api = factory;
      const player = factory(iframe.current);
      widget.current = player;
      player.bind(factory.Events.READY, () => { if (!disposed) setReady(true); });
      player.bind(factory.Events.FINISH, () => finish.current());
      player.bind(factory.Events.ERROR, () => { if (!disposed) { stop(); setError("Esta gravação não está disponível no player. Abra a aula original."); } });
    }).catch(() => { if (!disposed) setError("O player oficial não carregou. Confira sua conexão ou abra a aula original."); });
    return () => {
      disposed = true; stop(); setReady(false);
      if (api && widget.current) for (const key of ["READY", "FINISH", "ERROR"]) widget.current.unbind(api.Events[key]);
      widget.current = null;
    };
  }, [urls.length > 0, stop]);
  useEffect(() => { stop(); setIndex(0); }, [urls, stop]);
  useEffect(() => {
    if (!ready || !urls[index]) return;
    const token = serial.current;
    widget.current?.load(urls[index], { auto_play: false, callback: () => { if (token !== serial.current) widget.current?.pause(); } });
  }, [ready, urls]);
  const choose = (next: number) => {
    stop(); setIndex(next); setError("");
    widget.current?.load(urls[next], { auto_play: false, callback: () => {} });
  };
  const start = () => {
    if (!ready || !urls.length) return;
    stop(); setError(""); setRunning(true);
    const token = serial.current;
    const run = (i: number, pass: number, load: boolean) => {
      if (token !== serial.current) return;
      setIndex(i); setRepetition(pass + 1);
      const play = () => { if (token === serial.current) { widget.current?.seekTo(0); widget.current?.play(); } };
      finish.current = () => {
        finish.current = () => {};
        if (token !== serial.current) return;
        if (pass + 1 < settings.repeats) timer.current = window.setTimeout(() => run(i, pass + 1, false), settings.gap);
        else {
          const next = i + 1 < urls.length ? i + 1 : settings.loop ? 0 : -1;
          if (settings.continuous && next >= 0) timer.current = window.setTimeout(() => run(next, 0, true), settings.gap);
          else setRunning(false);
        }
      };
      if (load) widget.current?.load(urls[i], { auto_play: false, callback: play });
      else play();
    };
    run(index, 0, false);
  };
  const configure = (next: QueueSettings) => { stop(); setSettings(next); localStorage.setItem("ouvir-ingles:source-widget-queue", JSON.stringify(next)); };
  return { iframe, ready, error, index, choose, settings, configure, running, repetition, start, stop };
}
