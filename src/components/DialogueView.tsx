import { useEffect, useMemo, useState } from "react";
import type { Dialogue, Level } from "../types";
import type { SpeechController } from "../hooks/useSpeech";
import { useClipPlayer } from "../hooks/useClipPlayer";
import { useListeningQueue } from "../hooks/useListeningQueue";
import { QueueControls } from "./QueueControls";
import { ClickableText } from "../lib/tokens";

interface DialogueViewProps {
  dialogues: Dialogue[];
  speech: SpeechController;
  onSpeakLine: (text: string, alternate: boolean) => void;
  onSpeakDialogue: (lines: string[]) => void;
}

export function DialogueView({ dialogues, speech, onSpeakLine, onSpeakDialogue }: DialogueViewProps) {
  const [selectedId, setSelectedId] = useState(dialogues[0]?.id ?? "");
  const [theme, setTheme] = useState("all");
  const [level, setLevel] = useState<Level | "all">("all");
  const [humanOnly, setHumanOnly] = useState(false);
  const player = useClipPlayer();
  const themes = useMemo(() => [...new Set(dialogues.map((dialogue) => dialogue.theme))].sort(), [dialogues]);
  const visible = useMemo(() => dialogues.filter((dialogue) =>
    (theme === "all" || dialogue.theme === theme) &&
    (level === "all" || dialogue.level === level) &&
    (!humanOnly || Boolean(dialogue.audioUrl)),
  ), [dialogues, humanOnly, level, theme]);

  useEffect(() => {
    if (!visible.some((dialogue) => dialogue.id === selectedId)) setSelectedId(visible[0]?.id ?? "");
  }, [selectedId, visible]);

  const active = visible.find(dialogue => dialogue.id === selectedId) ?? visible[0];
  const lines = useMemo(() => visible.flatMap(dialogue => dialogue.lines.map((line, i) => ({
    id: `${dialogue.id}-${i}`, dialogueId: dialogue.id, text: line.english,
    audioUrl: line.audioStart !== undefined ? dialogue.audioUrl : undefined,
    start: line.audioStart, end: line.audioEnd, alternate: i % 2 === 1,
  }))), [visible]);
  const queue = useListeningQueue(lines, "ouvir-ingles:dialogue-queue", speech, i => setSelectedId(lines[i].dialogueId));
  const stop = () => { queue.stop(); player.stop(); speech.cancel(); };
  const playHuman = (dialogue: Dialogue, start = 0, end = Number.MAX_SAFE_INTEGER) => {
    stop(); if (dialogue.audioUrl) void player.play(dialogue.audioUrl, start, end, { rate: speech.rate });
  };
  useEffect(() => { player.stop(); speech.cancel(); }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) {
    return <div className="empty-panel"><h2>Nenhum diálogo neste filtro</h2><p>Escolha outro nível ou tema.</p></div>;
  }

  const speakLine = (text: string, alternate: boolean, start?: number, end?: number) => {
    if (active.audioUrl && start !== undefined) playHuman(active, start, end);
    else { stop(); onSpeakLine(text, alternate); }
  };

  return (
    <section className="dialogue-view">
      <aside className="dialogue-browser" aria-label="Escolha um diálogo">
        <div className="dialogue-filters">
          <label><span>Nível</span><select value={level} onChange={(event) => setLevel(event.target.value as Level | "all")}><option value="all">Todos</option>{["A1", "A2", "B1", "B2", "C1", "C2"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Tema</span><select value={theme} onChange={(event) => setTheme(event.target.value)}><option value="all">Todos os temas</option>{themes.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="check-row"><input type="checkbox" checked={humanOnly} onChange={(event) => setHumanOnly(event.target.checked)} /> Só áudio humano</label>
        </div>
        <p className="dialogue-count">{visible.length} diálogos</p>
        <div className="dialogue-list">
          {visible.map((dialogue) => (
            <button className={`dialogue-choice ${dialogue.id === active.id ? "active" : ""}`} key={dialogue.id} onClick={() => { stop(); setSelectedId(dialogue.id); }} type="button">
              <span>{dialogue.audioUrl ? "●" : dialogue.level}</span>
              <strong>{dialogue.title}</strong>
              <small>{dialogue.theme} · {dialogue.context}</small>
            </button>
          ))}
        </div>
      </aside>
      <article className="conversation-card">
        <header className="conversation-header">
          <div>
            <p className="card-category">{active.level} · {active.theme}{active.audioUrl ? " · Voz humana" : ""}</p>
            <h2>{active.title}</h2>
            <p>{active.context}</p>
          </div>
          <button className="listen-button" onClick={() => { stop(); if (active.audioUrl) playHuman(active); else onSpeakDialogue(active.lines.map(line => line.english)); }} type="button">
            ▶ {active.audioUrl ? "Ouvir áudio humano" : "Ouvir diálogo"}
          </button>
        </header>
        <QueueControls title="Escuta automática · falas" settings={queue.settings} onChange={next => { player.stop(); speech.cancel(); queue.configure(next); }} running={queue.running} repetition={queue.repetition} onStart={() => { player.stop(); speech.cancel(); queue.start(Math.max(0, lines.findIndex(line => line.dialogueId === active.id))); }} onStop={stop} count={lines.length} />
        {(queue.error || player.error) && <p className="coach-notice" role="alert">{queue.error || player.error}</p>}
        {active.source && (
          <div className="source-strip">Fonte: <a href={active.source.url} target="_blank" rel="noreferrer">{active.source.publisher} · {active.source.title}</a> · <a href={active.source.licenseUrl} target="_blank" rel="noreferrer">{active.source.license}</a></div>
        )}
        <div className="conversation-lines">
          {active.lines.map((line, index) => (
            <div className={`dialogue-line speaker-${index % 2}`} key={`${line.speaker}-${index}`}>
              <span className="speaker">{line.speaker}</span>
              <div className="speech-bubble">
                <button className="line-play" onClick={() => speakLine(line.english, index % 2 === 1, line.audioStart, line.audioEnd)} aria-label="Ouvir esta fala" type="button">▶</button>
                <p className="dialogue-english"><ClickableText text={line.english} className="" wordClassName="dialogue-word" onWord={(word) => { stop(); onSpeakLine(word, index % 2 === 1); }} /></p>
                {line.pronunciation && <p className="dialogue-sound">{line.pronunciation}</p>}
                <p className="dialogue-translation">{line.portuguese}</p>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
