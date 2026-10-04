export type ViewMode = "decoding" | "sentences" | "audio" | "sources" | "stories" | "dialogues" | "practice" | "grammar" | "favorites";
export type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type StageId = "foundation" | "daily" | "independent" | "natural" | "advanced" | "mastery";

export interface WordTiming {
  text: string;
  start: number;
  end: number;
}

export interface Category {
  id: string;
  number: number;
  title: string;
}

export interface Situation {
  id: string;
  number: number;
  categoryId: string;
  title: string;
  start?: string;
  end?: string;
}

export interface Sentence {
  id: string;
  english: string;
  pronunciation?: string;
  portuguese: string;
  categoryId: string;
  situationId: string;
  situationTitle?: string;
  origin: "guide" | "extra" | "idiom" | "advanced";
  audioUrl: string | null;
  sourcePage?: number;
  level?: Level;
  literalTranslation?: string;
  usageNote?: string;
}

export interface GuideData {
  meta: {
    title: string;
    source: string;
    language: string;
    count: number;
    schemaVersion: number;
  };
  categories: Category[];
  situations: Situation[];
  sentences: Sentence[];
}

export interface ExtrasData {
  meta: { title: string; count: number; schemaVersion: number };
  sentences: Sentence[];
}

export interface AdvancedData {
  meta: { title: string; count: number; schemaVersion: number };
  categories: Category[];
  situations: Situation[];
  sentences: Sentence[];
}

export interface DialogueLine {
  speaker: string;
  english: string;
  pronunciation?: string;
  portuguese: string;
  audioStart?: number;
  audioEnd?: number;
  words?: WordTiming[];
}

export interface AudioSource {
  publisher: string;
  title: string;
  url: string;
  contributor?: string;
  license: string;
  licenseUrl: string;
  textLicense?: string;
  textLicenseUrl?: string;
}

export interface AudioClip {
  id: string;
  english: string;
  portuguese: string;
  level: Level;
  audioUrl: string;
  duration: number;
  tags: string[];
  words: WordTiming[];
  source: AudioSource;
}

export interface AudioLibraryData {
  meta: { title: string; count: number; schemaVersion: number };
  clips: AudioClip[];
}

export interface StorySegment {
  id: string;
  english: string;
  portuguese: string;
  audioStart?: number;
  audioEnd?: number;
  words?: WordTiming[];
}

export interface Story {
  id: string;
  title: string;
  synopsis: string;
  level: Level;
  genre: string;
  estimatedMinutes: number;
  audioUrl?: string;
  source?: AudioSource;
  segments: StorySegment[];
}

export interface StoriesData {
  meta: { title: string; count: number; schemaVersion: number };
  stories: Story[];
}

export interface Dialogue {
  id: string;
  title: string;
  context: string;
  level: Level;
  theme: string;
  audioUrl?: string;
  source?: {
    publisher: string;
    title: string;
    url: string;
    license: string;
    licenseUrl: string;
  };
  lines: DialogueLine[];
}

export interface DialoguesData {
  meta: { count: number; schemaVersion: number };
  dialogues: Dialogue[];
}

export interface IdiomsData {
  meta: { title: string; count: number; schemaVersion: number };
  category: Category;
  situations: Situation[];
  sentences: Sentence[];
}

export interface GrammarExample {
  english: string;
  portuguese: string;
}

export interface GrammarLesson {
  id: string;
  level: Level;
  title: string;
  summary: string;
  pattern: string;
  listeningTip: string;
  commonMistake: string;
  examples: GrammarExample[];
  sourceUrl: string;
  theory?: {
    rules: string[];
    rows: { when: string; form: string; example: string }[];
  };
}

export interface GrammarData {
  meta: { title: string; count: number; schemaVersion: number };
  lessons: GrammarLesson[];
}

export interface ContentData {
  guide: GuideData;
  extras: Sentence[];
  dialogues: Dialogue[];
  grammar: GrammarLesson[];
  audioClips: AudioClip[];
  stories: Story[];
  idioms: Sentence[];
  sentences: Sentence[];
  categories: Category[];
  situations: Situation[];
  decoding: DecodingData;
}

export type ListeningError = "boundary" | "reduction" | "vocabulary" | "recognition" | "contraction" | "linking" | "weak-form" | "phoneme" | "speed";

export interface DecodingClip {
  id: string;
  english: string;
  portuguese: string;
  audioUrl: string;
  start: number;
  end: number;
  speaker: string;
  kind: "conversation" | "sentence" | "demonstration";
  words: WordTiming[];
  focus: ListeningError[];
  note: string;
  source: AudioSource;
}

export interface DecodingLesson {
  id: string;
  week: number;
  title: string;
  objective: string;
  explanation: string;
  task: string;
  focus: ListeningError[];
  clipIds: string[];
  transferIds: string[];
  pairIds: string[];
}

export interface SoundPair {
  id: string;
  label: string;
  tip: string;
  words: Array<{ text: string; audioUrl: string; source: AudioSource }>;
}

export interface DecodingData {
  meta: { title: string; schemaVersion: number; sources: Array<{ title: string; url: string; note: string }> };
  clips: DecodingClip[];
  lessons: DecodingLesson[];
  pairs: SoundPair[];
}
