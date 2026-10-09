import { useEffect, useMemo, useRef, useState } from "react";
import type { ContentData, Level } from "../types";
import type { SpeechController } from "../hooks/useSpeech";
import { levelForCategory } from "../lib/progression";
import { normalize } from "../lib/content";
import { STORAGE } from "../lib/storage";

type PracticeMode = "dictation" | "meaning" | "reply";

interface PracticeItem {
  id: string;
  english: string;
  portuguese: string;
  pronunciation?: string;
  level: Level;
  audioUrl?: string;
  audioProvider?: string;
  audioStart?: number;
  audioEnd?: number;
}

interface ReplyPair { id: string; prompt: PracticeItem; answer: PracticeItem }
interface PracticeSettings { translation: boolean; pronunciation: boolean; slow: boolean; wordBank: boolean; continuous: boolean }
interface PracticeProgress { attempts: number; correct: number; streak: number; bestStreak: number }

const defaultSettings: PracticeSettings = { translation: false, pronunciation: false, slow: false, wordBank: false, continuous: true };
const defaultProgress: PracticeProgress = { attempts: 0, correct: 0, streak: 0, bestStreak: 0 };

function readLocal<T>(key: string, fallback: T): T {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) ?? "{}") }; }
  catch { return fallback; }
}

function cleanAnswer(value: string): string {
  return normalize(value).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function rotate<T>(items: T[], start: number): T[] {
  if (!items.length) return [];
  const offset = ((start % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

export function ListeningPractice({ content, speech }: { content: ContentData; speech: SpeechController }) {
  const [mode, setMode] = useState<PracticeMode>("dictation");
  const [level, setLevel] = useState<Level | "all">("A1");
  const [cursor, setCursor] = useState(0);
  const [typed, setTyped] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<"idle" | "wrong" | "correct">("idle");
  const [revealed, setRevealed] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState("");
  const [settings, setSettings] = useState(() => readLocal(STORAGE.practiceSettings, defaultSettings));
  const [progress, setProgress] = useState(() => readLocal(STORAGE.practiceProgress, defaultProgress));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoTimerRef = useRef<number | undefined>(undefined);
  const autoPlayRef = useRef(false);

  const items = useMemo<PracticeItem[]>(() => {
    const sentenceItems = content.sentences
      .filter((entry) => entry.english.trim().split(/\s+/).length >= 3 && entry.english.trim().split(/\s+/).length <= 15)
      .map((entry) => ({
        id: `sentence-${entry.id}`,
        english: entry.english,
        portuguese: entry.portuguese,
        pronunciation: entry.pronunciation,
        level: entry.level ?? levelForCategory(entry.categoryId),
        audioUrl: entry.audioUrl ?? undefined,
        audioProvider: entry.audioProvider,
      }));
    const dialogueItems = content.dialogues.flatMap((dialogue) => dialogue.lines.map((line, index) => ({
      id: `dialogue-${dialogue.id}-${index}`,
      english: line.english,
      portuguese: line.portuguese,
      pronunciation: line.pronunciation,
      level: dialogue.level,
      audioUrl: dialogue.audioUrl,
      audioStart: line.audioStart,
      audioEnd: line.audioEnd,
    })));
    const humanItems = content.audioClips.map((clip) => ({
      id: `human-${clip.id}`, english: clip.english, portuguese: clip.portuguese,
      level: clip.level, audioUrl: clip.audioUrl, audioStart: 0, audioEnd: clip.duration,
    }));
    const unique = new Map<string, PracticeItem>();
    [...sentenceItems, ...dialogueItems, ...humanItems].forEach((item) => unique.set(cleanAnswer(item.english), item));
    return [...unique.values()];
  }, [content]);

  const pairs = useMemo<ReplyPair[]>(() => content.dialogues.flatMap((dialogue) => dialogue.lines.slice(0, -1).map((line, index) => ({
    id: `${dialogue.id}-${index}`,
    prompt: {
      id: `${dialogue.id}-${index}-prompt`, english: line.english, portuguese: line.portuguese,
      pronunciation: line.pronunciation, level: dialogue.level, audioUrl: dialogue.audioUrl,
      audioStart: line.audioStart, audioEnd: line.audioEnd,
    },
    answer: {
      id: `${dialogue.id}-${index + 1}-answer`, english: dialogue.lines[index + 1].english,
      portuguese: dialogue.lines[index + 1].portuguese, pronunciation: dialogue.lines[index + 1].pronunciation,
      level: dialogue.level, audioUrl: dialogue.audioUrl, audioStart: dialogue.lines[index + 1].audioStart,
      audioEnd: dialogue.lines[index + 1].audioEnd,
    },
  }))), [content.dialogues]);

  const pool = useMemo(() => items.filter((item) => level === "all" || item.level === level), [items, level]);
  const pairPool = useMemo(() => pairs.filter((pair) => level === "all" || pair.prompt.level === level), [level, pairs]);
  const item = pool.length ? pool[(cursor * 47 + 11) % pool.length] : undefined;
  const pair = pairPool.length ? pairPool[(cursor * 17 + 5) % pairPool.length] : undefined;
  const active = mode === "reply" ? pair?.prompt : item;
  const meaningChoices = useMemo(() => item ? rotate([
    item,
    pool[(pool.indexOf(item) + 29) % pool.length],
    pool[(pool.indexOf(item) + 71) % pool.length],
    pool[(pool.indexOf(item) + 113) % pool.length],
  ].filter((candidate, index, all) => candidate && all.findIndex((entry) => entry.portuguese === candidate.portuguese) === index), cursor).slice(0, 4) : [], [cursor, item, pool]);
  const replyChoices = useMemo(() => pair ? rotate([
    pair.answer,
    pairPool[(pairPool.indexOf(pair) + 7) % pairPool.length]?.answer,
    pairPool[(pairPool.indexOf(pair) + 19) % pairPool.length]?.answer,
    pairPool[(pairPool.indexOf(pair) + 31) % pairPool.length]?.answer,
  ].filter((candidate, index, all): candidate is PracticeItem => Boolean(candidate) && all.findIndex((entry) => entry?.english === candidate.english) === index), cursor).slice(0, 4) : [], [cursor, pair, pairPool]);

  const persistSettings = (next: PracticeSettings) => {
    setSettings(next);
    localStorage.setItem(STORAGE.practiceSettings, JSON.stringify(next));
  };

  const updateProgress = (correct: boolean) => {
    setProgress((current) => {
      const streak = correct ? current.streak + 1 : 0;
      const next = { attempts: current.attempts + 1, correct: current.correct + (correct ? 1 : 0), streak, bestStreak: Math.max(current.bestStreak, streak) };
      localStorage.setItem(STORAGE.practiceProgress, JSON.stringify(next));
      return next;
    });
  };

  const resetQuestion = () => {
    setTyped(""); setAttempts(0); setStatus("idle"); setRevealed(false); setSelectedChoice("");
  };

  useEffect(() => { resetQuestion(); setCursor(0); }, [level, mode]);
  useEffect(() => () => { audioRef.current?.pause(); if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current); }, []);

  const play = (target: PracticeItem | undefined, slow = false) => {
    if (!target) return;
    if (target.audioUrl) {
      speech.cancel();
      audioRef.current?.pause();
      const audio = new Audio(target.audioUrl);
      audioRef.current = audio;
      audio.currentTime = target.audioStart ?? 0;
      audio.playbackRate = slow ? 0.75 : speech.rate;
      if (target.audioEnd !== undefined) audio.addEventListener("timeupdate", () => { if (audio.currentTime >= target.audioEnd!) audio.pause(); });
      void audio.play();
      return;
    }
    speech.speakAtRate(target.english, slow ? 0.7 : speech.rate);
  };

  const judge = (correct: boolean, choiceId = "") => {
    setSelectedChoice(choiceId);
    if (correct) {
      setStatus("correct"); updateProgress(true);
      if (settings.continuous) {
        if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current);
        autoTimerRef.current = window.setTimeout(() => next(true), 850);
      }
    }
    else { setAttempts((value) => value + 1); setStatus("wrong"); updateProgress(false); }
  };

  const checkDictation = () => {
    if (!item || !typed.trim()) return;
    judge(cleanAnswer(typed) === cleanAnswer(item.english));
  };

  function next(autoPlay = false) {
    if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current);
    autoPlayRef.current = autoPlay;
    setCursor((value) => value + 1);
    resetQuestion();
  }
  useEffect(() => {
    if (!autoPlayRef.current) return;
    autoPlayRef.current = false;
    const timeout = window.setTimeout(() => play(active), 120);
    return () => window.clearTimeout(timeout);
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const words = item ? rotate(item.english.replace(/[^A-Za-z0-9'\s]/g, "").split(/\s+/), cursor * 3 + 2) : [];
  const accuracy = progress.attempts ? Math.round((progress.correct / progress.attempts) * 100) : 0;

  return (
    <section className="practice-view">
      <aside className="practice-settings">
        <p className="section-kicker">Modo difícil por padrão</p>
        <h2>Controle as ajudas</h2>
        <p>O treino começa só com som. Ligue uma pista apenas quando ela realmente ajudar.</p>
        {([
          ["translation", "Tradução", "Mostra o sentido em português."],
          ["pronunciation", "Pronúncia aproximada", "Mostra a leitura do guia quando existir."],
          ["slow", "Áudio lento", "Libera repetição em 0,7×."],
          ["wordBank", "Banco de palavras", "Mostra as palavras fora de ordem."],
          ["continuous", "Fluxo contínuo", "Acertou: avança e toca o próximo sem clicar."],
        ] as const).map(([key, label, description]) => (
          <label className="aid-toggle" key={key}><input type="checkbox" checked={settings[key]} onChange={(event) => persistSettings({ ...settings, [key]: event.target.checked })} /><span><strong>{label}</strong><small>{description}</small></span></label>
        ))}
        <div className="practice-score"><span><strong>{accuracy}%</strong> acertos</span><span><strong>{progress.streak}</strong> sequência</span><span><strong>{progress.bestStreak}</strong> melhor</span></div>
      </aside>
      <div className="practice-main">
        <header className="practice-toolbar">
          <div className="segmented-control">
            <button className={mode === "dictation" ? "active" : ""} onClick={() => setMode("dictation")} type="button">Ditado</button>
            <button className={mode === "meaning" ? "active" : ""} onClick={() => setMode("meaning")} type="button">Sentido</button>
            <button className={mode === "reply" ? "active" : ""} onClick={() => setMode("reply")} type="button">Conversa</button>
          </div>
          <select aria-label="Nível do treino" value={level} onChange={(event) => setLevel(event.target.value as Level | "all")}><option value="all">Todos</option>{["A1", "A2", "B1", "B2", "C1", "C2"].map((value) => <option key={value}>{value}</option>)}</select>
        </header>
        <article className={`practice-card ${status}`}>
          <div className="practice-prompt">
            <span>{active?.level} · {mode === "dictation" ? "Escreva exatamente o que ouvir" : mode === "meaning" ? "Escolha o sentido do áudio" : "Escolha a resposta natural"}</span>
            <strong>{cursor + 1}</strong>
          </div>
          <button className="big-listen" onClick={() => play(active)} type="button"><span>▶</span> Ouvir{active?.audioProvider === "ElevenLabs" || active?.audioUrl?.includes("/audio/elevenlabs/") ? " · ElevenLabs" : active?.audioProvider === "human" ? " voz humana" : active?.audioUrl ? " gravação" : ""}</button>
          {settings.slow && <button className="slow-listen" onClick={() => play(active, true)} type="button">Ouvir devagar · 0,7×</button>}

          {mode === "dictation" && item && (
            <div className="dictation-area">
              <label><span>Sua transcrição em inglês</span><textarea autoCapitalize="none" autoCorrect="off" spellCheck={false} value={typed} onChange={(event) => { setTyped(event.target.value); setStatus("idle"); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); checkDictation(); } }} placeholder="Digite o que você ouviu…" /></label>
              {settings.wordBank && <div className="word-bank">{words.map((word, index) => <span key={`${word}-${index}`}>{word}</span>)}</div>}
              <button className="check-answer" onClick={checkDictation} type="button">Conferir</button>
            </div>
          )}

          {mode === "meaning" && item && <div className="choice-grid">{meaningChoices.map((choice, index) => <button className={selectedChoice === choice.id ? "selected" : ""} disabled={status === "correct"} key={choice.id} onClick={() => judge(choice.id === item.id, choice.id)} type="button"><span>{String.fromCharCode(65 + index)}</span>{choice.portuguese}</button>)}</div>}

          {mode === "reply" && pair && <div className="audio-choice-grid">{replyChoices.map((choice, index) => <div className={selectedChoice === choice.id ? "selected" : ""} key={choice.id}><button onClick={() => play(choice)} type="button">▶ Ouvir resposta {index + 1}</button><button disabled={status === "correct"} onClick={() => judge(choice.id === pair.answer.id, choice.id)} type="button">Escolher {index + 1}</button>{(revealed || status === "correct") && <p>{choice.english}</p>}</div>)}</div>}

          {settings.translation && active && <p className="practice-hint"><strong>Tradução:</strong> {active.portuguese}</p>}
          {settings.pronunciation && active?.pronunciation && <p className="practice-hint"><strong>Pronúncia:</strong> {active.pronunciation}</p>}
          {status === "wrong" && <p className="feedback wrong">Ainda não. Ouça de novo antes de pedir outra pista.</p>}
          {status === "correct" && <div className="feedback correct"><strong>Boa escuta.</strong><span>{mode === "reply" ? pair?.answer.english : item?.english}</span></div>}
          {attempts >= 2 && status !== "correct" && <button className="reveal-button" onClick={() => setRevealed(true)} type="button">Último recurso: revelar transcrição</button>}
          {revealed && active && <p className="revealed-answer">{mode === "reply" ? pair?.answer.english : item?.english}</p>}
          {status === "correct" && <button className="next-exercise" onClick={() => next(settings.continuous)} type="button">{settings.continuous ? "Próximo áudio chegando…" : "Próximo exercício →"}</button>}
        </article>
      </div>
    </section>
  );
}
