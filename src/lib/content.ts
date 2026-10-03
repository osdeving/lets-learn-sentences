import type {
  ContentData,
  AdvancedData,
  AudioLibraryData,
  DialoguesData,
  ExtrasData,
  GrammarData,
  GuideData,
  IdiomsData,
  StoriesData,
  Sentence,
  Situation,
  DecodingData,
} from "../types";

async function fetchJSON<T>(path: string): Promise<T> {
  const response = await fetch(import.meta.env.BASE_URL + path.replace(/^\//, ""));
  if (!response.ok) throw new Error(`Não foi possível carregar ${path}: ${response.status}`);
  const data = await response.json();
  // Content stays portable; resolve local recordings at the loading boundary.
  function resolveAudio(value: unknown): void {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "audioUrl" && typeof child === "string" && child.startsWith("/")) {
        (value as Record<string, unknown>)[key] = import.meta.env.BASE_URL + child.slice(1);
      } else resolveAudio(child);
    }
  }
  resolveAudio(data);
  return data as T;
}

export async function loadContent(): Promise<ContentData> {
  const [guide, extrasData, dialoguesData, idiomsData, grammarData, advancedData, audioData, storiesData, decoding] = await Promise.all([
    fetchJSON<GuideData>("/data/sentences.json"),
    fetchJSON<ExtrasData>("/data/extras.json"),
    fetchJSON<DialoguesData>("/data/dialogues.json"),
    fetchJSON<IdiomsData>("/data/idioms.json"),
    fetchJSON<GrammarData>("/data/grammar.json"),
    fetchJSON<AdvancedData>("/data/advanced.json"),
    fetchJSON<AudioLibraryData>("/data/audio-library.json"),
    fetchJSON<StoriesData>("/data/stories.json"),
    fetchJSON<DecodingData>("/data/decoding.json"),
  ]);
  const extraSituations = extrasData.sentences.map<Situation>((entry) => ({
    id: entry.situationId,
    categoryId: entry.categoryId,
    number: 11,
    title: entry.situationTitle ?? "Variações novas",
  }));
  const situations = [...guide.situations, ...extraSituations, ...idiomsData.situations, ...advancedData.situations].filter(
    (item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index,
  );
  return {
    guide,
    extras: extrasData.sentences,
    dialogues: dialoguesData.dialogues,
    grammar: grammarData.lessons,
    audioClips: audioData.clips,
    stories: storiesData.stories,
    idioms: idiomsData.sentences,
    sentences: [...guide.sentences, ...extrasData.sentences, ...idiomsData.sentences, ...advancedData.sentences],
    categories: [...guide.categories, idiomsData.category, ...advancedData.categories],
    situations,
    decoding,
  };
}

export function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function situationTitle(entry: Sentence, situations: Situation[]): string {
  return (
    entry.situationTitle ??
    situations.find((situation) => situation.id === entry.situationId)?.title ??
    "Situação"
  );
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}
