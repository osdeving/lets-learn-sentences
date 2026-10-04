import type { VocabularyData, VocabularyEntry } from "./types";
export const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export interface VocabularyFilter {
  category: string;
  group: string;
  frequency: string;
  query: string;
  savedOnly: boolean;
  saved: Set<string>;
}
export function filterVocabulary(
  data: VocabularyData,
  filters: VocabularyFilter,
): VocabularyEntry[] {
  const terms = normalized(filters.query.trim()).split(/\s+/).filter(Boolean);
  return data.entries.filter((entry) => {
    if (filters.category !== "all" && entry.category !== filters.category)
      return false;
    if (filters.group !== "all" && entry.group !== filters.group) return false;
    if (filters.frequency !== "all" && entry.frequency !== filters.frequency)
      return false;
    if (filters.savedOnly && !filters.saved.has(entry.id)) return false;
    const category = data.categories.find((item) => item.id === entry.category);
    const haystack = normalized(
      [
        entry.en,
        entry.pt,
        entry.plural,
        ...(entry.tags ?? []),
        category?.en,
        category?.pt,
        ...(entry.variants ?? []).flatMap((item) => [item.en, item.pt]),
        ...entry.examples.flatMap((item) => [item.en, item.pt]),
      ]
        .filter(Boolean)
        .join(" "),
    );
    return terms.every((term) => haystack.includes(term));
  });
}
export function vocabularyQueue(
  entries: VocabularyEntry[],
  examples: boolean,
  base: string,
) {
  return entries.flatMap((entry) => [
    {
      id: entry.id,
      text: entry.en,
      audioUrl: resolveVocabularyAsset(entry.audioUrl, base),
    },
    ...(examples
      ? entry.examples.slice(0, 1).map((example) => ({
          id: `${entry.id}:example`,
          text: example.en,
          audioUrl: resolveVocabularyAsset(example.audioUrl, base),
        }))
      : []),
  ]);
}
export function resolveVocabularyAsset(url: string | undefined, base: string) {
  return url?.startsWith("/") ? base + url.slice(1) : url;
}
export function entryFromHash(hash: string): string | undefined {
  try {
    return hash.startsWith("#vocabulary/")
      ? decodeURIComponent(hash.slice("#vocabulary/".length))
      : undefined;
  } catch {
    return undefined;
  }
}
export function reviewChoices(
  entries: VocabularyEntry[],
  target: VocabularyEntry,
  random = Math.random,
): VocabularyEntry[] {
  const others = entries.filter(
    (entry) => entry.id !== target.id && entry.pt !== target.pt,
  );
  const distinct = [
    ...new Map(others.map((entry) => [entry.pt, entry])).values(),
  ];
  // Prefer plausible distractors from the same environment.
  const ranked = distinct
    .map((entry) => ({
      entry,
      rank: (entry.category === target.category ? 0 : 1) + random(),
    }))
    .sort((a, b) => a.rank - b.rank);
  const options = [target, ...ranked.slice(0, 3).map((item) => item.entry)];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}

// Match whole words, longest phrases first, so “phone” does not steal “phone charger”.
export function vocabularySegments(text: string, entries: VocabularyEntry[]) {
  const forms = new Map<string, VocabularyEntry>();
  for (const entry of entries) {
    for (const form of [
      entry.en,
      entry.plural,
      ...(entry.variants?.map((v) => v.en) ?? []),
      ...(entry.partOfSpeech.includes("noun") && !entry.en.endsWith("s")
        ? [entry.en + "s"]
        : []),
    ]) {
      if (form) forms.set(form.toLowerCase(), entry);
    }
  }
  if (!forms.size) return [{ text }];
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    "\\b(" +
      [...forms.keys()]
        .sort((a, b) => b.length - a.length)
        .map(escape)
        .join("|") +
      ")\\b",
    "gi",
  );
  const result: { text: string; entry?: VocabularyEntry }[] = [];
  let last = 0;
  for (const match of text.matchAll(regex)) {
    if (match.index! > last)
      result.push({ text: text.slice(last, match.index) });
    result.push({ text: match[0], entry: forms.get(match[0].toLowerCase()) });
    last = match.index! + match[0].length;
  }
  if (last < text.length) result.push({ text: text.slice(last) });
  return result;
}

export function storyListeningQueue(
  story: import("./types").VocabularyStory,
  sceneId: string,
  whole: boolean,
  base: string,
) {
  return (
    whole ? story.scenes : story.scenes.filter((scene) => scene.id === sceneId)
  ).flatMap((scene) => [
    {
      id: scene.id + ":setting",
      text: scene.setting.en,
      audioUrl: resolveVocabularyAsset(scene.setting.audioUrl, base),
      alternate: false,
    },
    ...scene.lines.map((line, index) => ({
      id: scene.id + ":" + index,
      text: line.en,
      audioUrl: resolveVocabularyAsset(line.audioUrl, base),
      alternate: story.characters.indexOf(line.speaker) % 2 === 1,
    })),
  ]);
}
