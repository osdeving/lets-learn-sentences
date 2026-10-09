import { useEffect, useMemo, useRef, useState } from "react";
import type { AudioClip } from "../types";
import { buildMrEnglishLesson } from "../lib/mrEnglish";
import { shadowPauseSeconds } from "../lib/shadow";
import { normalize } from "../lib/content";
import { useClipPlayer } from "../hooks/useClipPlayer";
import { useListeningQueue } from "../hooks/useListeningQueue";
import { useShadowQueue } from "../hooks/useShadowQueue";
import { QueueControls } from "./QueueControls";
import { MrEnglishSpeak } from "./MrEnglishSpeak";

type Mode = "full" | "words" | "sentences";
type Activity = "listen" | "shadow" | "speak";
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function MrEnglishView({ clips }: { clips: AudioClip[] }) {
  const [clipId, setClipId] = useState(clips[0]?.id ?? "");
  const clip = clips.find(item => item.id === clipId) ?? clips[0];
  if (!clip) return <div className="empty-panel"><h2>Nenhum episódio disponível</h2></div>;
  return <MrEnglishEpisode key={clip.id} clip={clip} episodes={clips} onEpisode={setClipId} />;
}

function MrEnglishEpisode({ clip, episodes, onEpisode }: { clip: AudioClip; episodes: AudioClip[]; onEpisode: (id: string) => void }) {
  const lesson = useMemo(() => buildMrEnglishLesson(clip), [clip]);
  const [mode, setMode] = useState<Mode>("full");
  const [activity, setActivity] = useState<Activity>("listen");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [index, setIndex] = useState(0);
  const [selectedOccurrences, setSelectedOccurrences] = useState<Record<string, number>>({});
  const [rate, setRate] = useState(1);
  const [order, setOrder] = useState("podcast");
  const [shuffle, setShuffle] = useState<string[] | null>(null);
  const [cursor, setCursor] = useState(0);
  const [showTranscript, setShowTranscript] = useState(true);
  const [follow, setFollow] = useState(true);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const full = useClipPlayer();
  const manual = useClipPlayer();
  const units = mode === "words" ? lesson.words : lesson.sentences;
  const categories = mode === "words" ? lesson.wordCategories : lesson.sentenceCategories;
  const visible = useMemo(() => {
    const needle = normalize(search);
    const result = units.filter(item => (category === "all" || item.category === category) && normalize(item.text).includes(needle));
    if (shuffle) result.sort((a, b) => shuffle.indexOf(a.id) - shuffle.indexOf(b.id));
    else if (order === "alphabetical") result.sort((a, b) => a.text.localeCompare(b.text, "en"));
    return result;
  }, [units, category, search, order, shuffle]);
  const active = visible[index] ?? visible[0];
  const occurrence = active ? selectedOccurrences[active.id] ?? Math.max(0, active.occurrences?.findIndex(item => item.start === active.start && item.end === active.end) ?? 0) : 0;
  const range = mode === "words" ? active?.occurrences?.[occurrence] ?? active : active;
  const items = useMemo(() => visible.map(item => {
    const selected = mode === "words" && selectedOccurrences[item.id] !== undefined ? item.occurrences?.[selectedOccurrences[item.id]] ?? item : item;
    return { id: item.id, text: item.text, audioUrl: clip.audioUrl, start: Math.max(0, selected.start - .04), end: selected.end, rate };
  }), [visible, clip.audioUrl, rate, mode, selectedOccurrences]);
  const queue = useListeningQueue(items, "ouvir-ingles:mr:listen", undefined, setIndex);
  const shadowItems = items;
  const shadow = useShadowQueue(shadowItems, `ouvir-ingles:mr:${clip.id}:${mode}:shadow`, setIndex);
  const stop = () => { full.stop(); manual.stop(); queue.stop(); shadow.stop(); };
  const select = (next: number) => { stop(); setIndex(next); };
  const changeMode = (next: Mode) => { if (full.playing) setCursor(full.position); stop(); setMode(next); setCategory("all"); setSearch(""); setIndex(0); setShuffle(null); };
  const playOriginal = () => {
    stop();
    if (range && active) void manual.play(clip.audioUrl, Math.max(0, range.start - .04), range.end, { rate });
  };
  const playFull = (from: number) => {
    stop(); setCursor(from);
    if (follow && showTranscript) transcriptRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    void full.play(clip.audioUrl, from, clip.duration, { rate, onComplete: () => setCursor(0) });
  };
  const playingPosition = full.playing ? full.position : cursor;
  const nextWord = clip.words.findIndex(word => word.start > full.position);
  const activeWord = full.playing ? (nextWord === -1 ? clip.words.length - 1 : Math.max(0, nextWord - 1)) : -1;
  useEffect(() => {
    const panel = transcriptRef.current;
    const word = panel?.querySelectorAll<HTMLButtonElement>("button")[activeWord];
    if (!panel || !word || !follow) return;
    const bounds = panel.getBoundingClientRect(), target = word.getBoundingClientRect();
    const visibleTop = Math.max(bounds.top, 10), visibleBottom = Math.min(bounds.bottom, innerHeight - 10);
    if (visibleBottom <= visibleTop) return;
    const delta = (target.top + target.bottom) / 2 - (visibleTop + visibleBottom) / 2;
    if (Math.abs(delta) > 12) panel.scrollTo({ top: panel.scrollTop + delta, behavior: "smooth" });
  }, [activeWord, follow]);
  useEffect(() => {
    const panel = listRef.current, button = panel?.querySelector<HTMLButtonElement>("button[aria-current='true']");
    if (panel && button) { const item = button.getBoundingClientRect(), bounds = panel.getBoundingClientRect(); if (item.top < bounds.top || item.bottom > bounds.bottom) panel.scrollTop += item.top - bounds.top - panel.clientHeight / 2 + item.height / 2; }
  }, [index]);
  const currentShadow = active ? shadowItems.find(item => item.id === active.id) : undefined;
  const pause = currentShadow ? shadowPauseSeconds(currentShadow, shadow.settings) : 0;
  const override = active ? shadow.settings.overrides[active.id] : undefined;
  const wordContext = mode === "words" && range && "wordIndex" in range ? lesson.sentences.find(sentence => sentence.occurrences?.some(item => item.wordIndex === range.wordIndex)) : undefined;
  const error = mode === "full" ? full.error : manual.error || (activity === "shadow" ? shadow.error : queue.error);

  return <section className="mr-english" aria-label="Mr. English">
    <header className="mr-heading"><div><p className="section-kicker">Mr. English · estudo com o áudio original</p><h2>{clip.title}</h2><p>{clock(clip.duration)} · {clip.words.length.toLocaleString("pt-BR")} palavras no áudio · {lesson.words.length} palavras únicas · {lesson.sentences.length} sentenças</p></div>
      {episodes.length > 1 && <label>Episódio<select value={clip.id} onChange={event => { stop(); onEpisode(event.target.value); }}>{episodes.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
    </header>
    <nav className="mr-modes" aria-label="Dividir o podcast">{([["full", "Áudio completo"], ["words", "Palavras"], ["sentences", "Sentenças"]] as const).map(([id, label]) => <button aria-pressed={mode === id} className={mode === id ? "active" : ""} onClick={() => changeMode(id)} key={id} type="button">{label}</button>)}</nav>
    <div className="mr-speed"><span>Velocidade</span>{[.75, 1, 1.25].map(value => <button type="button" aria-pressed={rate === value} className={rate === value ? "active" : ""} key={value} onClick={() => { setCursor(playingPosition); stop(); setRate(value); }}>{value}×</button>)}</div>
    {error && <p className="coach-notice" role="alert">{error}</p>}
    {mode === "full" ? <article className="mr-full">
      <div className="mr-full-controls"><button className="listen-button" type="button" onClick={() => { if (full.playing) { setCursor(full.position); full.stop(); } else playFull(cursor); }}>{full.playing ? "Pausar áudio" : cursor > 0 ? "Continuar áudio" : "Ouvir áudio completo"}</button><button type="button" onClick={() => { stop(); setCursor(0); }}>Voltar ao início</button><span>{clock(playingPosition)} / {clock(clip.duration)}</span></div>
      <label className="mr-seek">Posição no episódio<input aria-label="Posição no episódio" type="range" min="0" max={clip.duration - .05} step=".1" value={Math.min(playingPosition, clip.duration - .05)} onChange={event => { const value = Number(event.target.value); if (full.playing) playFull(value); else setCursor(value); }} /></label>
      <div className="mr-transcript-options"><label><input type="checkbox" checked={showTranscript} onChange={event => setShowTranscript(event.target.checked)} /> Mostrar transcrição</label><label><input type="checkbox" checked={follow} onChange={event => setFollow(event.target.checked)} /> Centralizar palavra ativa</label></div>
      {showTranscript && <div className="mr-transcript" ref={transcriptRef} aria-label="Transcrição do podcast">{clip.words.map((word, wordIndex) => <button type="button" data-word-index={wordIndex} className={wordIndex === activeWord ? "active" : ""} key={wordIndex} onClick={() => playFull(word.start)} title={`Continuar daqui · ${clock(word.start)}`}>{word.text}</button>)}</div>}
      <p className="coach-small">Clique numa palavra para continuar o episódio daquele ponto. Para ouvir só o trecho, use Palavras ou Sentenças.</p>
    </article> : <div className="mr-workspace">
      <aside className="mr-browser">
        <label>Categoria<select value={category} onChange={event => { stop(); setCategory(event.target.value); setIndex(0); }}><option value="all">Todas (all) · {units.length}</option>{categories.filter(item => item.id !== "all").map(item => <option value={item.id} key={item.id}>{item.title} · {units.filter(unit => unit.category === item.id).length}</option>)}</select></label>
        <label>Buscar<input type="search" placeholder={mode === "words" ? "Buscar palavra…" : "Buscar sentença…"} value={search} onChange={event => { stop(); setSearch(event.target.value); setIndex(0); }} /></label>
        <label>Ordem<select value={order} onChange={event => { stop(); setOrder(event.target.value); setShuffle(null); setIndex(0); }}><option value="podcast">Ordem do podcast</option><option value="alphabetical">Alfabética</option></select></label>
        <button type="button" onClick={() => { stop(); const ids = visible.map(item => item.id); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; } setShuffle(ids); setIndex(0); }}>Embaralhar seleção</button>
        <p>{visible.length} {mode === "words" ? "palavras únicas" : "sentenças"}{shuffle ? " · embaralhadas" : ""}</p>
        <div className="mr-unit-list" ref={listRef}>{visible.map((item, itemIndex) => <button aria-current={active?.id === item.id ? "true" : undefined} type="button" key={item.id} onClick={() => select(itemIndex)}><strong>{item.text}</strong><small>{clock(item.start)} · {(item.end - item.start).toFixed(2)}s{mode === "words" ? ` · ${item.occurrences?.length ?? 1}× no áudio` : ""}</small></button>)}</div>
      </aside>
      <article className="mr-study">
        {!active ? <div className="empty-panel"><h3>Nenhum item neste filtro</h3><p>Mude a categoria ou a busca.</p></div> : <>
          <div className="mr-unit-meta"><span>{categories.find(item => item.id === active.category)?.title}</span><span>{index + 1} / {visible.length}</span></div>
          <h3 className={`mr-unit-text ${mode}`}>{active.text}</h3>
          {wordContext && <p className="mr-context"><span>No podcast</span>{wordContext.text}</p>}
          {mode === "words" && (active.occurrences?.length ?? 0) > 1 && <label className="mr-occurrence">Ocorrência para ouvir<select value={Math.min(occurrence, (active.occurrences?.length ?? 1) - 1)} onChange={event => { stop(); setSelectedOccurrences(current => ({ ...current, [active.id]: Number(event.target.value) })); }}>{active.occurrences?.map((item, number) => <option key={number} value={number}>{number + 1} · {clock(item.start)} · {(item.end - item.start).toFixed(2)}s</option>)}</select></label>}
          <div className="mr-card-actions">{activity !== "speak" && <button type="button" className="listen-button" onClick={playOriginal}>Ouvir {mode === "words" ? "palavra" : "sentença"}</button>}<button type="button" disabled={index === 0} onClick={() => select(index - 1)}>← Anterior</button><button type="button" disabled={index >= visible.length - 1} onClick={() => select(index + 1)}>Próxima →</button></div>
          <nav className="mr-activities" aria-label="Atividade">{([["listen", "Escuta"], ["shadow", "Shadowing"], ["speak", "Falar e comparar"]] as const).map(([id, label]) => <button type="button" aria-pressed={activity === id} className={activity === id ? "active" : ""} key={id} onClick={() => { stop(); setActivity(id); }}>{label}</button>)}</nav>
          {activity === "listen" && <QueueControls title={`Escuta automática · ${mode === "words" ? "palavras" : "sentenças"}`} settings={queue.settings} onChange={next => { stop(); queue.configure(next); }} running={queue.running} repetition={queue.repetition} onStart={() => { stop(); queue.start(index); }} onStop={stop} count={visible.length} />}
          {activity === "shadow" && <section className="mr-shadow" aria-label="Configurar shadowing"><h3>Ouça e repita</h3><p>O trecho toca as vezes escolhidas. Depois de “Repeat please”, repita em voz alta durante a pausa e siga para o próximo item.</p>
            <div className="mr-shadow-settings">
              <label>Repetições do original<input type="number" min="1" max="20" value={shadow.settings.repeats} onChange={event => shadow.configure({ repeats: Number(event.target.value) })} /></label>
              <label>Intervalo entre repetições (ms)<input type="number" min="0" max="10000" step="100" value={shadow.settings.gap} onChange={event => shadow.configure({ gap: Number(event.target.value) })} /></label>
              <label>Pausa por duração do trecho (×)<input type="number" min=".5" max="5" step=".25" value={shadow.settings.pauseFactor} onChange={event => shadow.configure({ pauseFactor: Number(event.target.value) })} /></label>
              <label>Tempo extra para responder (s)<input type="number" min="0" max="30" step=".5" value={shadow.settings.extraPause} onChange={event => shadow.configure({ extraPause: Number(event.target.value) })} /></label>
              <label>Pausa mínima (s)<input type="number" min=".5" max="30" step=".5" value={shadow.settings.minimumPause} onChange={event => shadow.configure({ minimumPause: Number(event.target.value) })} /></label>
              <label>Ajuste só deste item (s)<input type="number" min=".5" max="120" step=".5" placeholder={`Automático: ${pause.toFixed(1)}`} value={override ?? ""} onChange={event => { const overrides = { ...shadow.settings.overrides }; if (event.target.value === "") delete overrides[active.id]; else overrides[active.id] = Number(event.target.value); shadow.configure({ overrides }); }} /></label>
            </div>
            <div className="mr-shadow-toggles"><label><input type="checkbox" checked={shadow.settings.continuous} onChange={event => shadow.configure({ continuous: event.target.checked })} /> Avançar automaticamente</label><label><input type="checkbox" checked={shadow.settings.loop} onChange={event => shadow.configure({ loop: event.target.checked })} /> Recomeçar a seleção ao final</label></div>
            <p className="mr-pause-explanation">Este item: {((currentShadow?.end ?? 0) - (currentShadow?.start ?? 0)).toFixed(2)}s de áudio · {pause.toFixed(1)}s para repetir{override !== undefined ? " (ajuste salvo para este item)" : ` (${shadow.settings.pauseFactor}× a duração na velocidade escolhida + ${shadow.settings.extraPause}s, com mínimo de ${shadow.settings.minimumPause}s)`}.</p>
            <div className="mr-shadow-actions"><button type="button" className="listen-button" onClick={() => { if (shadow.running) stop(); else { stop(); shadow.start(index); } }}>{shadow.running ? "Parar shadowing" : "Iniciar shadowing"}</button><span role="status" aria-live="polite">{shadow.phase === "listen" ? `Ouça · ${shadow.repetition}/${shadow.settings.repeats}` : shadow.phase === "prompt" ? "Repeat please" : shadow.phase === "repeat" ? `Sua vez · ${shadow.remaining.toFixed(1)}s` : "Pronto para começar"}</span></div>
          </section>}
          {activity === "speak" && <MrEnglishSpeak itemKey={active.id} text={active.text} onPlayOriginal={playOriginal} onBeforeCapture={stop} />}
        </>}
      </article>
    </div>}
    <footer className="mr-credit"><p>{clip.alignmentNote}</p><p>Áudio original por <strong>{clip.source.contributor}</strong> no <a href={clip.source.url} target="_blank" rel="noreferrer">YouTube</a>. {clip.source.permissionNote}</p><p>Os trechos usam o mesmo arquivo do podcast. O aviso “Repeat please” é uma voz sintetizada localmente.</p></footer>
  </section>;
}
