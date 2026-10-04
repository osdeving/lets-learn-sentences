export interface SpokenText {
  en: string;
  pt: string;
  audioUrl?: string;
}
export interface VocabularyVariant extends SpokenText {
  kind: "synonym" | "regional" | "informal" | "technical";
  note?: string;
  pronunciation?: string;
}
export interface VocabularyEntry extends SpokenText {
  id: string;
  category: string;
  group: string;
  frequency: "common" | "specific" | "technical";
  partOfSpeech: string;
  pronunciation: { ipa: string; guide: string; tip?: string };
  emoji: string;
  image?: { src: string; alt: string };
  examples: SpokenText[];
  variants?: VocabularyVariant[];
  notes?: { kind: "usage" | "culture" | "pitfall" | "grammar"; text: string }[];
  chunks?: SpokenText[];
  plural?: string;
  related?: string[];
  grammar?: string[];
  tags?: string[];
  sources?: string[];
}
export interface VocabularyCategory extends SpokenText {
  id: string;
  description: string;
  image: string;
  color: string;
  groups: (SpokenText & { id: string })[];
  hotspots?: { group: string; x: number; y: number }[];
}
export interface VocabularyData {
  schemaVersion: 1;
  title: string;
  pronunciationNote: string;
  categories: VocabularyCategory[];
  entries: VocabularyEntry[];
  stories?: VocabularyStory[];
}

export interface VocabularyScene extends SpokenText {
  id: string;
  setting: SpokenText;
  words: string[];
  lines: (SpokenText & { speaker: string })[];
}
export interface VocabularyStory extends SpokenText {
  id: string;
  description: string;
  image: string;
  characters: string[];
  scenes: VocabularyScene[];
}
