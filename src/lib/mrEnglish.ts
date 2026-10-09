import type { AudioClip, WordTiming } from "../types";

export interface MrEnglishOccurrence {
  start: number;
  end: number;
  wordIndex: number;
}

export interface MrEnglishUnit {
  id: string;
  text: string;
  start: number;
  end: number;
  category: string;
  occurrences?: MrEnglishOccurrence[];
}

export interface MrEnglishCategory {
  id: string;
  title: string;
}

export interface MrEnglishLesson {
  words: MrEnglishUnit[];
  sentences: MrEnglishUnit[];
  wordCategories: MrEnglishCategory[];
  sentenceCategories: MrEnglishCategory[];
}

// These are vocabulary lists, not a grammatical analysis of each occurrence.
// A word such as "practice" can have several roles in the podcast.
const vocabularyGroups: Array<MrEnglishCategory & { terms: Set<string> }> = [
  {
    id: "people",
    title: "Pessoas e referências",
    terms: new Set("i me my mine myself you your yours yourself yourselves he him his himself she her hers herself it its itself we us our ours ourselves they them their theirs themselves someone somebody anyone anybody everyone everybody nobody people person friend friends teacher teachers learner learners emily paul mr".split(" ")),
  },
  {
    id: "connecting",
    title: "Palavras de ligação",
    terms: new Set("a an the this that these those and or but because so if when while whether as although though than then to of for with without in on at by from into over under about through between before after until since unless instead also even both either neither each every all some any such which who what how where why".split(" ")),
  },
  {
    id: "time",
    title: "Tempo e frequência",
    terms: new Set("time times today tomorrow yesterday now later early earlier first second third fourth fifth next last daily everyday regularly regular morning mornings evening evenings day days week weeks month months year years minute minutes hour hours often always never sometimes usually once twice again already still soon finally long longer short shorter fast faster slow slower".split(" ")),
  },
  {
    id: "learning",
    title: "Aprendizado e estudo",
    terms: new Set("learn learns learned learning study studies studied studying english language languages vocabulary word words phrase phrases sentence sentences grammar pronunciation lesson lessons topic topics skill skills level levels beginner beginners intermediate advanced fluent fluency progress improve improves improved improving improvement goal goals method methods course courses understand understanding remember remembering memory memorize memorizing review reviewing notebook notes test tests quiz quizzes mistakes mistake".split(" ")),
  },
  {
    id: "communication",
    title: "Prática e comunicação",
    terms: new Set("practice practices practiced practicing practise practising speak speaks spoke speaking talk talks talking say says said saying tell tells told telling listen listens listening hear hears heard hearing read reads reading write writes writing repeat repeats repeated repeating shadowing conversation conversations communication communicate answer answers ask asks asked asking question questions podcast podcasts audio video videos watch watches watching sound sounds voice voices record recorded recording aloud explain explaining share shares sharing chat chatting".split(" ")),
  },
  {
    id: "routine",
    title: "Rotina e atividades",
    terms: new Set("routine routines habit habits house home work working job commute commuting cleaning clean cook cooking walk walking book books story stories music movie movies show shows phone computer app apps online internet social media schedule schedules coffee tea breakfast lunch dinner kitchen food room gym bus train supermarket shopping".split(" ")),
  },
  {
    id: "motivation",
    title: "Motivação e emoções",
    terms: new Set("happy happiness confident confidence comfortable motivation motivated motivate motivating patience patient dedication dedication excited exciting afraid fear worry worried worrying nervous frustrated frustration enjoy enjoys enjoying fun love loves loving believe believes believing proud positive encourage encouragement success successful celebrate celebrating challenge challenges difficult easy easier hard harder helpful better best awesome perfect smart smarter effectively effort efforts relaxed relax interesting interested".split(" ")),
  },
];

const wordCategoryDefinitions: MrEnglishCategory[] = [
  { id: "all", title: "Todas" },
  { id: "apostrophes", title: "Contrações e apóstrofos" },
  { id: "numbers", title: "Números e símbolos" },
  ...vocabularyGroups.map(({ id, title }) => ({ id, title })),
  { id: "other", title: "Outras palavras" },
];

const sentenceCategoryDefinitions: MrEnglishCategory[] = [
  { id: "all", title: "Todas" },
  { id: "questions", title: "Perguntas" },
  { id: "short", title: "Curtas (até 5 palavras)" },
  { id: "medium", title: "Médias (6 a 12 palavras)" },
  { id: "long", title: "Longas (13 ou mais palavras)" },
];

const abbreviations = new Set([
  "mr", "mrs", "ms", "dr", "prof", "st", "jr", "sr", "vs", "e.g", "i.e",
]);

function normalizeWord(text: string): string {
  const normalized = text.normalize("NFKC").replace(/[‘’]/g, "'").trim().toLocaleLowerCase("en");
  // Strip surrounding punctuation while retaining contractions and hyphenated
  // words. A percentage sign is an actual timed token in this transcript.
  return normalized
    .replace(/^[^\p{L}\p{N}'%]+|[^\p{L}\p{N}'%]+$/gu, "")
    .replace(/^'(.+)'$/u, "$1")
    .replace(/[.!?,;:]+$/u, "");
}

function wordCategory(text: string): string {
  if (text.includes("'")) return "apostrophes";
  if (/[\p{N}%]/u.test(text)) return "numbers";
  return vocabularyGroups.find(group => group.terms.has(text))?.id ?? "other";
}

function endsSentence(word: WordTiming, isLast: boolean): boolean {
  if (isLast) return true;
  const text = word.text.trim().replace(/["'”’\])}]+$/u, "");
  if (/[!?]+$/u.test(text)) return true;
  if (!/\.$/u.test(text)) return false;
  const withoutPeriod = text.slice(0, -1).toLocaleLowerCase("en");
  if (abbreviations.has(withoutPeriod)) return false;
  // Initials and abbreviations such as J. and U.S. remain with the next token.
  if (/^(?:[a-z]\.)*[a-z]$/iu.test(withoutPeriod)) return false;
  return true;
}

function occurrence(word: WordTiming, wordIndex: number): MrEnglishOccurrence {
  return { start: word.start, end: word.end, wordIndex };
}

function primaryOccurrence(occurrences: MrEnglishOccurrence[]): MrEnglishOccurrence {
  // Whisper can place a word in a 20 ms interval. Prefer an existing occurrence
  // with a usable duration, rather than extending it into neighbouring words.
  return occurrences.find(item => item.end - item.start >= 0.08 && item.end - item.start <= 1.4)
    ?? occurrences.reduce((best, item) => item.end - item.start > best.end - best.start ? item : best);
}

function categoriesFor(units: MrEnglishUnit[], definitions: MrEnglishCategory[]): MrEnglishCategory[] {
  const used = new Set(units.map(unit => unit.category));
  return definitions.filter(category => category.id === "all" || used.has(category.id));
}

/** Derive practice units without changing the recording or its word timings. */
export function buildMrEnglishLesson(clip: AudioClip): MrEnglishLesson {
  const groupedWords = new Map<string, MrEnglishOccurrence[]>();
  clip.words.forEach((word, wordIndex) => {
    const text = normalizeWord(word.text);
    if (!/[\p{L}\p{N}%]/u.test(text)) return;
    const occurrences = groupedWords.get(text) ?? [];
    occurrences.push(occurrence(word, wordIndex));
    groupedWords.set(text, occurrences);
  });

  // Keep vocabulary in order of its first appearance in the recording.
  const words: MrEnglishUnit[] = [...groupedWords].map(([text, occurrences]) => {
    const primary = primaryOccurrence(occurrences);
    return {
      id: `${clip.id}:word:${encodeURIComponent(text)}`,
      text,
      start: primary.start,
      end: primary.end,
      category: wordCategory(text),
      occurrences,
    };
  });

  const sentences: MrEnglishUnit[] = [];
  let sentenceStart = 0;
  clip.words.forEach((word, wordIndex) => {
    if (!endsSentence(word, wordIndex === clip.words.length - 1)) return;
    const timedWords = clip.words.slice(sentenceStart, wordIndex + 1);
    const text = timedWords.map(item => item.text).join(" ");
    const category = /\?["'”’\])}]*$/u.test(text.trim()) ? "questions"
      : timedWords.length <= 5 ? "short"
      : timedWords.length <= 12 ? "medium" : "long";
    sentences.push({
      id: `${clip.id}:sentence:${sentenceStart}`,
      text,
      start: timedWords[0].start,
      end: Math.max(...timedWords.map(item => item.end)),
      category,
      occurrences: timedWords.map((item, offset) => occurrence(item, sentenceStart + offset)),
    });
    sentenceStart = wordIndex + 1;
  });

  return {
    words,
    sentences,
    wordCategories: categoriesFor(words, wordCategoryDefinitions),
    sentenceCategories: categoriesFor(sentences, sentenceCategoryDefinitions),
  };
}
