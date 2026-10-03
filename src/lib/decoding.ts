import type { DecodingClip, ListeningError } from "../types";
import { STORAGE } from "./storage";

export const ERROR_LABELS: Record<ListeningError, string> = {
  boundary: "Fronteira entre palavras", reduction: "Redução", vocabulary: "Vocabulário desconhecido",
  recognition: "Conhecia, mas não reconheci", contraction: "Contração", linking: "Ligação / assimilação",
  "weak-form": "Forma fraca / schwa", phoneme: "Confusão de sons", speed: "Velocidade / acesso à palavra",
};

const expansions: Record<string, string> = {
  "i'm": "i am", "you're": "you are", "we're": "we are", "they're": "they are", "it's": "it is",
  "that's": "that is", "there's": "there is", "he's": "he is", "she's": "she is", "what's": "what is",
  "don't": "do not", "doesn't": "does not", "didn't": "did not", "can't": "can not", "won't": "will not",
  "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not",
  "couldn't": "could not", "wouldn't": "would not", "shouldn't": "should not",
  "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
  "i've": "i have", "you've": "you have", "we've": "we have", "they've": "they have",
  "would've": "would have", "could've": "could have", "should've": "should have", "might've": "might have",
  "i'll": "i will", "you'll": "you will", "he'll": "he will", "she'll": "she will", "we'll": "we will", "they'll": "they will",
  "i'd": "i would", "you'd": "you would", "he'd": "he would", "she'd": "she would", "we'd": "we would", "they'd": "they would",
  gonna: "going to", wanna: "want to", gotta: "got to", hafta: "have to", kinda: "kind of", sorta: "sort of",
  "cannot": "can not",
};

export function normalizeDictation(text: string): string[] {
  const words = text.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter(Boolean);
  return words.flatMap((word, index) => {
    if (/^(i|you|he|she|we|they)'d$/.test(word) && /^(known|seen|gone|done|told|had|taken|left|heard|found|made|been)$/.test(words[index + 1] ?? ""))
      return [word.split("'")[0], "had"];
    if (/^(it|he|she|that|there)'s$/.test(word) && /^(been|got|had)$/.test(words[index + 1] ?? ""))
      return [word.split("'")[0], "has"];
    return (expansions[word] ?? word).split(" ");
  });
}

export interface DiffToken { expected: string; heard: string; kind: "match" | "missing" | "extra" | "changed" }
export function compareDictation(expectedText: string, heardText: string): { score: number; errors: number; tokens: DiffToken[] } {
  const a = normalizeDictation(expectedText), b = normalizeDictation(heardText);
  const dp = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1]));
  const tokens: DiffToken[] = [];
  let i = a.length, j = b.length;
  while (i || j) {
    if (i && j && dp[i][j] === dp[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1])) {
      tokens.unshift({ expected: a[--i], heard: b[--j], kind: a[i] === b[j] ? "match" : "changed" });
    } else if (i && dp[i][j] === dp[i - 1][j] + 1) tokens.unshift({ expected: a[--i], heard: "", kind: "missing" });
    else tokens.unshift({ expected: "", heard: b[--j], kind: "extra" });
  }
  const errors = dp[a.length][b.length];
  return { score: a.length ? Math.round(Math.max(0, 1 - errors / a.length) * 100) : 0, errors, tokens };
}

export function characterDiff(expected: string, heard: string): Array<{ text: string; changed: boolean }> {
  // LCS keeps insertions from shifting every subsequent character.
  const a = [...expected], b = [...heard];
  const dp = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    dp[i][j] = a[i].toLowerCase() === b[j].toLowerCase() ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const result: Array<{ text: string; changed: boolean }> = [];
  let i = 0, j = 0;
  while (i < a.length) {
    if (j < b.length && a[i].toLowerCase() === b[j].toLowerCase()) { result.push({ text: a[i++], changed: false }); j++; }
    else if (j < b.length && dp[i][j + 1] > dp[i + 1][j]) j++;
    else result.push({ text: a[i++], changed: true });
  }
  return result;
}

export interface ClipMemory { due: number; interval: number; reviews: number; lapses: number; lastStudied: number; lastScore: number; delayedScore?: number }
export interface ListeningAttempt {
  id: string; clipId: string; lessonId: string; at: number; mode: "lesson" | "review" | "transfer" | "adaptive" | "contrast";
  initialScore: number; blindScore: number; errors: ListeningError[]; slowUsed: boolean; listens: number;
}
export interface CoachProgress {
  version: 1; memories: Record<string, ClipMemory>; attempts: ListeningAttempt[]; completedLessons: string[];
  studyDays: string[]; startedAt: number;
}
export function freshProgress(): CoachProgress { return { version: 1, memories: {}, attempts: [], completedLessons: [], studyDays: [], startedAt: Date.now() }; }
export function readCoachProgress(): CoachProgress {
  try { return validateProgress(JSON.parse(localStorage.getItem(STORAGE.decodingProgress) ?? "null")); }
  catch { return freshProgress(); }
}
export function validateProgress(data: unknown): CoachProgress {
  if (!data || typeof data !== "object") throw new Error("Backup inválido");
  const v = data as CoachProgress;
  if (v.version !== 1 || !v.memories || typeof v.memories !== "object" || Array.isArray(v.memories) ||
    !Array.isArray(v.attempts) || !Array.isArray(v.completedLessons) || !Array.isArray(v.studyDays) || !Number.isFinite(v.startedAt)) throw new Error("Backup de outra versão ou incompleto");
  if (!v.completedLessons.every(x => typeof x === "string") || !v.studyDays.every(x => typeof x === "string")) throw new Error("Backup inválido");
  for (const m of Object.values(v.memories)) if (!m || ![m.due, m.interval, m.reviews, m.lapses, m.lastStudied, m.lastScore].every(Number.isFinite)) throw new Error("Revisões inválidas");
  for (const a of v.attempts) if (!a || typeof a.clipId !== "string" || typeof a.lessonId !== "string" || !Number.isFinite(a.at) || !Number.isFinite(a.initialScore) || !Number.isFinite(a.blindScore) || !Array.isArray(a.errors) || !a.errors.every(x => x in ERROR_LABELS)) throw new Error("Tentativas inválidas");
  return v;
}
export function saveCoachProgress(progress: CoachProgress) { localStorage.setItem(STORAGE.decodingProgress, JSON.stringify(progress)); }
export const DAY = 86400000;
export function localDay(at = Date.now()): string { const d = new Date(at); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
export function scheduleReview(previous: ClipMemory | undefined, score: number, effort: "again" | "hard" | "easy", now: number, retentionTest = true): ClipMemory {
  const delayed = retentionTest && previous && now - previous.lastStudied >= 20 * 3600000;
  // Repeating today never increases the spacing or counts as a retention test.
  let interval = previous?.interval ?? 1;
  if (effort === "again" || score < 70) interval = 0;
  else if (effort === "hard" || score < 95) interval = 1;
  else if (delayed) interval = [1, 3, 7, 14, 30].find(x => x > interval) ?? 30;
  return {
    due: now + (interval ? interval * DAY : 10 * 60000), interval,
    reviews: (previous?.reviews ?? 0) + Number(Boolean(delayed)),
    lapses: (previous?.lapses ?? 0) + Number(effort === "again" || score < 70),
    lastStudied: now, lastScore: score, delayedScore: delayed ? score : previous?.delayedScore,
  };
}
export function dueClips(clips: DecodingClip[], progress: CoachProgress, now = Date.now()): DecodingClip[] {
  return clips.filter(c => progress.memories[c.id]?.due <= now).sort((a, b) => progress.memories[a.id].due - progress.memories[b.id].due);
}
export function errorProfile(progress: CoachProgress): Array<{ key: ListeningError; count: number; percent: number }> {
  const counts = Object.keys(ERROR_LABELS).map(key => ({ key: key as ListeningError, count: progress.attempts.reduce((n, a) => n + Number(a.errors.includes(key as ListeningError)), 0) }));
  const total = counts.reduce((n, x) => n + x.count, 0);
  return counts.map(x => ({ ...x, percent: total ? Math.round(x.count / total * 100) : 0 })).sort((a, b) => b.count - a.count);
}
export function adaptiveClips(clips: DecodingClip[], progress: CoachProgress, speaker = "all"): DecodingClip[] {
  const profile = errorProfile(progress);
  return clips.filter(c => speaker === "all" || c.speaker === speaker).map(c => ({ clip: c, priority:
    c.focus.reduce((n, focus) => n + (profile.find(x => x.key === focus)?.count ?? 0), 0) * 5 +
    (progress.memories[c.id]?.due <= Date.now() ? 10 : 0) + (!progress.memories[c.id] ? 4 : 0),
  })).sort((a, b) => b.priority - a.priority || a.clip.id.localeCompare(b.clip.id)).map(x => x.clip);
}
export const DAILY_BLOCKS = [
  { title: "Áudio novo + microditado", minutes: 15, action: "lesson", description: "Ouça 2–3 vezes em 1× e escreva o que ouviu." },
  { title: "Transcrição + erros", minutes: 15, action: "lesson", description: "Compare os trechos e marque por que você não os ouviu." },
  { title: "Microloops", minutes: 15, action: "lesson", description: "Repita o trecho difícil 5–10 vezes, depois a frase completa." },
  { title: "Shadowing", minutes: 15, action: "lesson", description: "Imite com atraso, depois junto. Grave para comparar, se quiser." },
  { title: "Revisão surpresa", minutes: 15, action: "review", description: "Ouça o material que venceu, sem transcrição nem tradução." },
  { title: "Listening por prazer", minutes: 15, action: "free", description: "Ouça a mesma pessoa em uma conversa completa, sem cobrança." },
] as const;
