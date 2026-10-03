import { useEffect, useMemo, useRef, useState } from "react";
import type { AudioClip, Level, WordTiming } from "../types";
import { STORAGE } from "../lib/storage";

interface AudioSettings {
  transcript: boolean;
  translation: boolean;
  autoAdvance: boolean;
  speed: number;
  repeats: number;
}

const defaults: AudioSettings = { transcript: false, translation: false, autoAdvance: true, speed: 1, repeats: 1 };

function readSettings(): AudioSettings {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE.audioSettings) ?? "{}") }; }
  catch { return defaults; }
}

export function AudioLibraryView({ clips }: { clips: AudioClip[] }) {
  const [level, setLevel] = useState<Level | "all">("all");
  const [speaker, setSpeaker] = useState("all");
  const [index, setIndex] = useState(0);
  const [settings, setSettings] = useState(readSettings);
  const [playing, setPlaying] = useState(false);
  const [activeWord, setActiveWord] = useState(-1);
  const [heard, setHeard] = useState<Set<string>>(() => new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playSerial = useRef(0);

  const speakers = useMemo(() => [...new Set(clips.map((clip) => clip.source.contributor).filter(Boolean))] as string[], [clips]);
  const visible = useMemo(() => clips.filter((clip) =>
    (level === "all" || clip.level === level) && (speaker === "all" || clip.source.contributor === speaker),
  ), [clips, level, speaker]);
  const active = visible[index] ?? visible[0];

  useEffect(() => { setIndex(0); stop(); }, [level, speaker]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const save = (next: AudioSettings) => {
    setSettings(next);
    localStorage.setItem(STORAGE.audioSettings, JSON.stringify(next));
  };

  const stop = () => {
    playSerial.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
    setActiveWord(-1);
  };

  const playClip = (clip: AudioClip, clipIndex: number, start = 0, end?: number, isWord = false) => {
    stop();
    const serial = playSerial.current;
    const audio = new Audio(clip.audioUrl);
    audioRef.current = audio;
    audio.playbackRate = settings.speed;
    audio.currentTime = Math.max(0, start - (isWord ? 0.04 : 0));
    let played = 0;
    const finish = () => {
      if (serial !== playSerial.current) return;
      if (isWord) { stop(); return; }
      played += 1;
      if (settings.repeats === 0 || played < settings.repeats) {
        audio.currentTime = start;
        void audio.play();
        return;
      }
      setHeard((current) => new Set(current).add(clip.id));
      setPlaying(false);
      setActiveWord(-1);
      if (settings.autoAdvance && visible.length > 1) {
        const nextIndex = (clipIndex + 1) % visible.length;
        setIndex(nextIndex);
        window.setTimeout(() => playClip(visible[nextIndex], nextIndex), 180);
      }
    };
    audio.addEventListener("timeupdate", () => {
      const time = audio.currentTime;
      setActiveWord(clip.words.findIndex((word) => time >= word.start && time < word.end));
      if (end !== undefined && time >= end) finish();
    });
    audio.addEventListener("ended", finish);
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const playWord = (word: WordTiming) => {
    if (active) playClip(active, index, word.start, word.end, true);
  };

  const choose = (nextIndex: number) => {
    stop();
    setIndex(nextIndex);
  };

  if (!active) return <div className="empty-panel"><h2>Nenhum áudio neste filtro</h2><p>Escolha outro nível ou falante.</p></div>;

  return (
    <section className="audio-lab">
      <aside className="audio-browser">
        <p className="section-kicker">Gravações reais · Tatoeba</p>
        <h2>Biblioteca humana</h2>
        <p>Uma reprodução inicia a fila. Com fluxo contínuo ligado, o próximo áudio começa sozinho.</p>
        <div className="audio-filter-row">
          <label><span>Nível</span><select value={level} onChange={(event) => setLevel(event.target.value as Level | "all")}><option value="all">Todos</option>{["B1", "B2", "C1", "C2"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Falante</span><select value={speaker} onChange={(event) => setSpeaker(event.target.value)}><option value="all">Todos</option>{speakers.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <label className="aid-toggle"><input type="checkbox" checked={settings.autoAdvance} onChange={(event) => save({ ...settings, autoAdvance: event.target.checked })} /><span><strong>Fluxo contínuo</strong><small>Ao terminar, avança e toca sem outro clique.</small></span></label>
        <label className="aid-toggle"><input type="checkbox" checked={settings.transcript} onChange={(event) => save({ ...settings, transcript: event.target.checked })} /><span><strong>Mostrar transcrição</strong><small>Deixe desligado para praticar sem legenda.</small></span></label>
        <label className="aid-toggle"><input type="checkbox" checked={settings.translation} onChange={(event) => save({ ...settings, translation: event.target.checked })} /><span><strong>Mostrar tradução</strong><small>Use depois de formar uma hipótese.</small></span></label>
        <div className="audio-settings-row"><span>Velocidade</span><div>{[0.75, 1, 1.25].map((value) => <button className={settings.speed === value ? "active" : ""} key={value} onClick={() => save({ ...settings, speed: value })} type="button">{value}×</button>)}</div></div>
        <div className="audio-settings-row"><span>Repetição</span><div>{[[1, "1×"], [3, "3×"], [0, "∞"]].map(([value, label]) => <button className={settings.repeats === value ? "active" : ""} key={value} onClick={() => save({ ...settings, repeats: Number(value) })} type="button">{label}</button>)}</div></div>
        <p className="dialogue-count">{visible.length} clipes · {heard.size} ouvidos</p>
        <div className="audio-list">{visible.map((clip, clipIndex) => <button className={clip.id === active.id ? "active" : ""} key={clip.id} onClick={() => choose(clipIndex)} type="button"><span>{heard.has(clip.id) ? "✓" : clip.level}</span><strong>{clip.english}</strong><small>{clip.source.contributor} · {clip.duration.toFixed(1)}s</small></button>)}</div>
      </aside>
      <article className="audio-stage">
        <header>
          <div><p className="card-category">{active.level} · voz humana · {active.source.contributor}</p><h2>Ouça primeiro.<br /><em>Depois desmonte.</em></h2></div>
          <span className="audio-position">{index + 1} / {visible.length}</span>
        </header>
        <button className={`audio-orb ${playing ? "playing" : ""}`} onClick={() => playing ? stop() : playClip(active, index)} type="button"><span>{playing ? "■" : "▶"}</span>{playing ? "Parar" : settings.autoAdvance ? "Iniciar fluxo" : "Ouvir frase"}</button>
        <div className={`human-transcript ${settings.transcript ? "shown" : "hidden"}`}>
          {settings.transcript ? (
            <p>{active.words.map((word, wordIndex) => <button className={wordIndex === activeWord ? "active" : ""} key={`${word.text}-${wordIndex}`} onClick={() => playWord(word)} title="Ouvir esta palavra na gravação" type="button">{word.text}</button>)}</p>
          ) : <button onClick={() => save({ ...settings, transcript: true })} type="button">Revelar transcrição como último recurso</button>}
          {settings.transcript && <small>Clique em qualquer palavra para ouvir exatamente aquele trecho da gravação.</small>}
        </div>
        {settings.translation && <p className="audio-translation">{active.portuguese}</p>}
        <div className="audio-shortcuts"><button disabled={visible.length < 2} onClick={() => choose((index - 1 + visible.length) % visible.length)} type="button">← Anterior</button><button disabled={visible.length < 2} onClick={() => choose((index + 1) % visible.length)} type="button">Próxima →</button></div>
        <footer className="audio-credit">Áudio por <strong>{active.source.contributor}</strong> no <a href={active.source.url} target="_blank" rel="noreferrer">Tatoeba</a>, <a href={active.source.licenseUrl} target="_blank" rel="noreferrer">{active.source.license}</a>. Texto: <a href={active.source.textLicenseUrl} target="_blank" rel="noreferrer">{active.source.textLicense}</a>.</footer>
      </article>
    </section>
  );
}
