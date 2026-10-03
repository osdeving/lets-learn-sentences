import { useEffect, useMemo, useState } from "react";
import type { Level, Story, StorySegment } from "../types";
import type { SpeechController } from "../hooks/useSpeech";
import { QueueControls } from "./QueueControls";
import { useListeningQueue } from "../hooks/useListeningQueue";
import { STORAGE } from "../lib/storage";

interface StorySettings { transcript: boolean; translation: boolean; speed: number }
const defaults: StorySettings = { transcript: false, translation: false, speed: 1 };

function readSettings(): StorySettings {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE.storySettings) ?? "{}") }; }
  catch { return defaults; }
}

export function StoriesView({ stories, speech }: { stories: Story[]; speech: SpeechController }) {
  const [level, setLevel] = useState<Level | "all">("all");
  const [selectedId, setSelectedId] = useState(stories[0]?.id ?? "");
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [settings, setSettings] = useState(readSettings);

  const visible = useMemo(() => stories.filter((story) => level === "all" || story.level === level), [level, stories]);
  const active = visible.find((story) => story.id === selectedId) ?? visible[0];
  const segment = active?.segments[segmentIndex] ?? active?.segments[0];

  const queueItems = useMemo(() => active?.segments.map(segment => ({ id: segment.id, text: segment.english,
    audioUrl: segment.audioStart !== undefined ? active.audioUrl : undefined, start: segment.audioStart, end: segment.audioEnd, rate: settings.speed * speech.rate })) ?? [], [active, settings.speed, speech.rate]);
  const queue = useListeningQueue(queueItems, "ouvir-ingles:story-queue", speech, setSegmentIndex);
  const stop = () => { queue.stop(); speech.cancel(); };
  useEffect(() => { if (!active) return; setSelectedId(active.id); setSegmentIndex(0); }, [active?.id, level]);
  const save = (next: StorySettings) => { stop(); setSettings(next); localStorage.setItem(STORAGE.storySettings, JSON.stringify(next)); };
  const goTo = (story: Story, nextIndex: number) => { stop(); setSegmentIndex((nextIndex + story.segments.length) % story.segments.length); };
  const playSegment = (_story: Story, targetIndex: number) => { speech.cancel(); queue.start(targetIndex, true); };

  const chooseStory = (story: Story) => {
    stop();
    setSelectedId(story.id);
    setSegmentIndex(0);
  };

  const speakWord = (word: string) => { stop(); speech.speak(word.replace(/[^A-Za-z'-]/g, "")); };

  if (!active || !segment) return <div className="empty-panel"><h2>Nenhuma história neste nível</h2><p>Escolha outro filtro.</p></div>;

  return (
    <section className="stories-view">
      <aside className="story-browser">
        <p className="section-kicker">Listening em contexto</p>
        <h2>Short stories</h2>
        <p>Ouça uma história inteira ou avance trecho a trecho. As legendas começam fechadas.</p>
        <label className="story-level"><span>Nível</span><select value={level} onChange={(event) => setLevel(event.target.value as Level | "all")}><option value="all">Todos</option>{["A2", "B1", "B2", "C1", "C2"].map((item) => <option key={item}>{item}</option>)}</select></label>

        <label className="aid-toggle"><input type="checkbox" checked={settings.transcript} onChange={(event) => save({ ...settings, transcript: event.target.checked })} /><span><strong>Transcrição</strong><small>Mostra o inglês e libera palavras clicáveis.</small></span></label>
        <label className="aid-toggle"><input type="checkbox" checked={settings.translation} onChange={(event) => save({ ...settings, translation: event.target.checked })} /><span><strong>Tradução</strong><small>Mostra o sentido depois da tentativa.</small></span></label>
        <div className="audio-settings-row"><span>Velocidade</span><div>{[0.75, 1, 1.25].map((value) => <button className={settings.speed === value ? "active" : ""} key={value} onClick={() => save({ ...settings, speed: value })} type="button">{value}×</button>)}</div></div>
        <div className="story-list">{visible.map((story) => <button className={story.id === active.id ? "active" : ""} key={story.id} onClick={() => chooseStory(story)} type="button"><span>{story.level}{story.audioUrl ? " · HUMANA" : ""}</span><strong>{story.title}</strong><small>{story.genre} · {story.estimatedMinutes} min</small></button>)}</div>
      </aside>
      <article className="story-stage">
        <header><p className="card-category">{active.level} · {active.genre}</p><h2>{active.title}</h2><p>{active.synopsis}</p></header>
        {active.source && <div className="source-strip">Fonte: <a href={active.source.url} target="_blank" rel="noreferrer">{active.source.publisher} · {active.source.title}</a> · <a href={active.source.licenseUrl} target="_blank" rel="noreferrer">{active.source.license}</a></div>}
        <div className="story-progress" aria-label={`Trecho ${segmentIndex + 1} de ${active.segments.length}`}><span style={{ width: `${((segmentIndex + 1) / active.segments.length) * 100}%` }} /></div>
        <div className="story-player">
          <p className="story-counter">TRECHO {String(segmentIndex + 1).padStart(2, "0")} / {String(active.segments.length).padStart(2, "0")}</p>
          <QueueControls title="Escuta automática · história" settings={queue.settings} onChange={queue.configure} running={queue.running} repetition={queue.repetition} onStart={() => { speech.cancel(); queue.start(segmentIndex); }} onStop={stop} count={queueItems.length} />
          {queue.error && <p className="coach-notice" role="alert">{queue.error}</p>}

          {settings.transcript ? <p className="story-text">{segment.english.split(/(\s+)/).map((part, wordIndex) => /^\s+$/.test(part) ? part : <button key={`${part}-${wordIndex}`} onClick={() => speakWord(part)} type="button">{part}</button>)}</p> : <button className="story-reveal" onClick={() => save({ ...settings, transcript: true })} type="button">Revelar o texto deste trecho</button>}
          {settings.translation && <p className="story-translation">{segment.portuguese}</p>}
          <div className="story-nav"><button onClick={() => goTo(active, segmentIndex - 1)} type="button">← trecho</button><button onClick={() => playSegment(active, segmentIndex)} type="button">↻ repetir</button><button onClick={() => goTo(active, segmentIndex + 1)} type="button">trecho →</button></div>
        </div>
        <div className="story-segments">{active.segments.map((item: StorySegment, itemIndex) => <button className={itemIndex === segmentIndex ? "active" : ""} key={item.id} onClick={() => { stop(); setSegmentIndex(itemIndex); }} type="button"><span>{String(itemIndex + 1).padStart(2, "0")}</span><strong>{settings.transcript ? item.english : "Ouça antes de revelar"}</strong></button>)}</div>
      </article>
    </section>
  );
}
