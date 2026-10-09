import { useEffect, useMemo, useRef, useState } from "react";
import type { AudioClip, Level, WordTiming } from "../types";
import { QueueControls } from "./QueueControls";
import { useListeningQueue } from "../hooks/useListeningQueue";
import { STORAGE } from "../lib/storage";

interface AudioSettings {
  transcript: boolean;
  translation: boolean;
  speed: number;
}

const defaults: AudioSettings = { transcript: false, translation: false, speed: 1 };

function readSettings(): AudioSettings {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE.audioSettings) ?? "{}") }; }
  catch { return defaults; }
}

export function AudioLibraryView({ clips, initialClipId }: { clips: AudioClip[]; initialClipId?: string }) {
  const [level, setLevel] = useState<Level | "all">("all");
  const [speaker, setSpeaker] = useState("all");
  const [index, setIndex] = useState(0);
  const [settings, setSettings] = useState(readSettings);

  const transcriptRef = useRef<HTMLParagraphElement>(null);
  const [heard, setHeard] = useState<Set<string>>(() => new Set());


  const speakers = useMemo(() => [...new Set(clips.map((clip) => clip.source.contributor).filter(Boolean))] as string[], [clips]);
  const visible = useMemo(() => clips.filter((clip) =>
    (level === "all" || clip.level === level) && (speaker === "all" || clip.source.contributor === speaker),
  ), [clips, level, speaker]);
  const active = visible[index] ?? visible[0];

  const queueItems = useMemo(() => visible.map(clip => ({ id: clip.id, text: clip.english, audioUrl: clip.audioUrl, end: clip.duration, rate: settings.speed })), [visible, settings.speed]);
  const queue = useListeningQueue(queueItems, "ouvir-ingles:audio-queue", undefined, setIndex, id => setHeard(current => new Set(current).add(id)));
  const wordItems = useMemo(() => active?.words.map((word, i) => ({ id: String(i), text: word.text, audioUrl: active.audioUrl, start: Math.max(0, word.start - .04), end: word.end, rate: settings.speed })) ?? [], [active, settings.speed]);
  const wordQueue = useListeningQueue(wordItems, "ouvir-ingles:audio-word-queue");
  const activeWord = wordQueue.running ? wordQueue.index : queue.running ? (active?.words.findIndex(word => queue.position >= word.start && queue.position < word.end) ?? -1) : -1;
  useEffect(() => {
    const paragraph = transcriptRef.current;
    const word = paragraph?.querySelectorAll("button")[activeWord];
    if (!paragraph || !word || active?.words.length <= 80) return;
    const bounds = word.getBoundingClientRect(), view = paragraph.getBoundingClientRect();
    paragraph.scrollTo({ top: paragraph.scrollTop + (bounds.top + bounds.bottom - view.top - view.bottom) / 2, behavior: "smooth" });
  }, [activeWord, active?.id, active?.words.length]);
  const stop = () => { queue.stop(); wordQueue.stop(); };
  useEffect(() => {
    const target = visible.findIndex(clip => clip.id === initialClipId);
    setIndex(Math.max(0, target)); stop();
  }, [level, speaker, initialClipId]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = (next: AudioSettings) => { stop(); setSettings(next); localStorage.setItem(STORAGE.audioSettings, JSON.stringify(next)); };
  const playWord = (word: WordTiming) => { stop(); wordQueue.start(active.words.indexOf(word), true); };
  const choose = (nextIndex: number) => { stop(); setIndex(nextIndex); };

  if (!active) return <div className="empty-panel"><h2>Nenhum áudio neste filtro</h2><p>Escolha outro nível ou falante.</p></div>;

  const voiceLabel = active.source.voiceType === "unverified" ? "tipo de voz não verificado" : active.source.voiceType === "synthetic" ? "voz sintetizada" : "voz humana";
  return (
    <section className="audio-lab">
      <aside className="audio-browser">
        <p className="section-kicker">Gravações · Tatoeba</p>
        <h2>Biblioteca de áudio</h2>
        <p>Escolha o nível e o falante. Inicie a escuta automática para repetir cada clipe e avançar pela seleção.</p>
        <div className="audio-filter-row">
          <label><span>Nível</span><select value={level} onChange={(event) => setLevel(event.target.value as Level | "all")}><option value="all">Todos</option>{["B1", "B2", "C1", "C2"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Falante</span><select value={speaker} onChange={(event) => setSpeaker(event.target.value)}><option value="all">Todos</option>{speakers.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>

        <label className="aid-toggle"><input type="checkbox" checked={settings.transcript} onChange={(event) => save({ ...settings, transcript: event.target.checked })} /><span><strong>Mostrar transcrição</strong><small>Deixe desligado para praticar sem legenda.</small></span></label>
        <label className="aid-toggle"><input type="checkbox" checked={settings.translation} onChange={(event) => save({ ...settings, translation: event.target.checked })} /><span><strong>Mostrar tradução</strong><small>Use depois de formar uma hipótese.</small></span></label>
        <div className="audio-settings-row"><span>Velocidade</span><div>{[0.75, 1, 1.25].map((value) => <button className={settings.speed === value ? "active" : ""} key={value} onClick={() => save({ ...settings, speed: value })} type="button">{value}×</button>)}</div></div>

        <p className="dialogue-count">{visible.length} clipes · {heard.size} ouvidos</p>
        <div className="audio-list">{visible.map((clip, clipIndex) => <button className={clip.id === active.id ? "active" : ""} key={clip.id} onClick={() => choose(clipIndex)} type="button"><span>{heard.has(clip.id) ? "✓" : clip.level}</span><strong>{clip.title ?? clip.english}</strong><small>{clip.source.contributor} · {clip.duration.toFixed(1)}s</small></button>)}</div>
      </aside>
      <article className="audio-stage">
        <header>
          <div><p className="card-category">{active.level} · {voiceLabel} · {active.source.contributor}</p><h2>{active.title ?? <>Ouça primeiro.<br /><em>Depois desmonte.</em></>}</h2></div>
          <span className="audio-position">{index + 1} / {visible.length}</span>
        </header>
        <QueueControls title="Escuta automática · gravação" settings={queue.settings} onChange={next => { wordQueue.stop(); queue.configure(next); }} running={queue.running} repetition={queue.repetition} onStart={() => { wordQueue.stop(); queue.start(index); }} onStop={stop} count={visible.length} />
        {(queue.error || wordQueue.error) && <p className="coach-notice" role="alert">{queue.error || wordQueue.error}</p>}

        <div className={`human-transcript ${active.words.length > 80 ? "long-transcript" : ""} ${settings.transcript ? "shown" : "hidden"}`}>
          {settings.transcript ? (
            <p ref={transcriptRef}>{active.words.map((word, wordIndex) => <button className={wordIndex === activeWord ? "active" : ""} key={`${word.text}-${wordIndex}`} onClick={() => playWord(word)} title="Ouvir esta palavra na gravação" type="button">{word.text}</button>)}</p>
          ) : <button onClick={() => save({ ...settings, transcript: true })} type="button">Revelar transcrição como último recurso</button>}
          {settings.transcript && <small>Clique em qualquer palavra para ouvir seu trecho na gravação.</small>}
        </div>
        {active.alignmentNote && <p className="coach-small">{active.alignmentNote}</p>}
        {settings.translation && <p className="audio-translation">{active.portuguese || "Tradução não disponível para este áudio."}</p>}
        <div className="audio-shortcuts"><button disabled={visible.length < 2} onClick={() => choose((index - 1 + visible.length) % visible.length)} type="button">← Anterior</button><button disabled={visible.length < 2} onClick={() => choose((index + 1) % visible.length)} type="button">Próxima →</button></div>
        <footer className="audio-credit">Áudio por <strong>{active.source.contributor}</strong> no <a href={active.source.url} target="_blank" rel="noreferrer">{active.source.publisher}</a>, <a href={active.source.licenseUrl} target="_blank" rel="noreferrer">{active.source.license}</a>. {active.source.textLicense && active.source.textLicenseUrl && <>Texto: <a href={active.source.textLicenseUrl} target="_blank" rel="noreferrer">{active.source.textLicense}</a>.</>}
          {active.source.permissionNote && <p>{active.source.permissionNote}</p>}</footer>
      </article>
    </section>
  );
}
