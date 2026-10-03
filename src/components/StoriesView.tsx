import { useEffect, useMemo, useRef, useState } from "react";
import type { Level, Story, StorySegment } from "../types";
import type { SpeechController } from "../hooks/useSpeech";
import { STORAGE } from "../lib/storage";

interface StorySettings { transcript: boolean; translation: boolean; continuous: boolean; speed: number }
const defaults: StorySettings = { transcript: false, translation: false, continuous: true, speed: 1 };

function readSettings(): StorySettings {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE.storySettings) ?? "{}") }; }
  catch { return defaults; }
}

export function StoriesView({ stories, speech }: { stories: Story[]; speech: SpeechController }) {
  const [level, setLevel] = useState<Level | "all">("all");
  const [selectedId, setSelectedId] = useState(stories[0]?.id ?? "");
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [settings, setSettings] = useState(readSettings);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const serialRef = useRef(0);
  const visible = useMemo(() => stories.filter((story) => level === "all" || story.level === level), [level, stories]);
  const active = visible.find((story) => story.id === selectedId) ?? visible[0];
  const segment = active?.segments[segmentIndex] ?? active?.segments[0];

  const stop = () => {
    serialRef.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    speech.cancel();
    setPlaying(false);
  };

  useEffect(() => { if (!active) return; setSelectedId(active.id); setSegmentIndex(0); stop(); }, [active?.id, level]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (next: StorySettings) => {
    setSettings(next);
    localStorage.setItem(STORAGE.storySettings, JSON.stringify(next));
  };

  const goTo = (story: Story, nextIndex: number, shouldPlay: boolean) => {
    const bounded = (nextIndex + story.segments.length) % story.segments.length;
    setSegmentIndex(bounded);
    if (shouldPlay) window.setTimeout(() => playSegment(story, bounded, true), 120);
  };

  const playSegment = (story: Story, targetIndex: number, fromFlow = false) => {
    stop();
    const serial = serialRef.current;
    const target = story.segments[targetIndex];
    if (!target) return;
    setSegmentIndex(targetIndex);
    setPlaying(true);
    const finish = () => {
      if (serial !== serialRef.current) return;
      setPlaying(false);
      if ((fromFlow || settings.continuous) && targetIndex < story.segments.length - 1) goTo(story, targetIndex + 1, true);
    };
    if (story.audioUrl && target.audioStart !== undefined) {
      const audio = new Audio(story.audioUrl);
      audioRef.current = audio;
      audio.playbackRate = settings.speed;
      audio.currentTime = target.audioStart;
      audio.addEventListener("timeupdate", () => { if (target.audioEnd !== undefined && audio.currentTime >= target.audioEnd) { audio.pause(); finish(); } });
      audio.addEventListener("ended", finish);
      void audio.play().catch(() => setPlaying(false));
      return;
    }
    if (!("speechSynthesis" in window)) { setPlaying(false); return; }
    const utterance = new SpeechSynthesisUtterance(target.english);
    utterance.lang = "en-US";
    utterance.rate = settings.speed * speech.rate;
    const voice = speech.voices.find((item) => item.voiceURI === speech.voiceURI);
    if (voice) utterance.voice = voice;
    utterance.onend = finish;
    utterance.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  const chooseStory = (story: Story) => {
    stop();
    setSelectedId(story.id);
    setSegmentIndex(0);
  };

  const speakWord = (word: string) => speech.speak(word.replace(/[^A-Za-z'-]/g, ""));

  if (!active || !segment) return <div className="empty-panel"><h2>Nenhuma história neste nível</h2><p>Escolha outro filtro.</p></div>;

  return (
    <section className="stories-view">
      <aside className="story-browser">
        <p className="section-kicker">Listening em contexto</p>
        <h2>Short stories</h2>
        <p>Ouça uma história inteira ou avance trecho a trecho. As legendas começam fechadas.</p>
        <label className="story-level"><span>Nível</span><select value={level} onChange={(event) => setLevel(event.target.value as Level | "all")}><option value="all">Todos</option>{["A2", "B1", "B2", "C1", "C2"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="aid-toggle"><input type="checkbox" checked={settings.continuous} onChange={(event) => save({ ...settings, continuous: event.target.checked })} /><span><strong>Continuar sozinho</strong><small>O próximo trecho começa automaticamente.</small></span></label>
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
          <button className={`story-play ${playing ? "playing" : ""}`} onClick={() => playing ? stop() : playSegment(active, segmentIndex, settings.continuous)} type="button"><span>{playing ? "■" : "▶"}</span>{playing ? "Parar" : segmentIndex === 0 && settings.continuous ? "Ouvir história" : "Ouvir trecho"}</button>
          {settings.transcript ? <p className="story-text">{segment.english.split(/(\s+)/).map((part, wordIndex) => /^\s+$/.test(part) ? part : <button key={`${part}-${wordIndex}`} onClick={() => speakWord(part)} type="button">{part}</button>)}</p> : <button className="story-reveal" onClick={() => save({ ...settings, transcript: true })} type="button">Revelar o texto deste trecho</button>}
          {settings.translation && <p className="story-translation">{segment.portuguese}</p>}
          <div className="story-nav"><button onClick={() => goTo(active, segmentIndex - 1, false)} type="button">← trecho</button><button onClick={() => playSegment(active, segmentIndex)} type="button">↻ repetir</button><button onClick={() => goTo(active, segmentIndex + 1, false)} type="button">trecho →</button></div>
        </div>
        <div className="story-segments">{active.segments.map((item: StorySegment, itemIndex) => <button className={itemIndex === segmentIndex ? "active" : ""} key={item.id} onClick={() => { stop(); setSegmentIndex(itemIndex); }} type="button"><span>{String(itemIndex + 1).padStart(2, "0")}</span><strong>{settings.transcript ? item.english : "Ouça antes de revelar"}</strong></button>)}</div>
      </article>
    </section>
  );
}
