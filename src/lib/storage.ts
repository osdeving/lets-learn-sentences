export const STORAGE = {
  favorites: "ouvir-ingles:v1:favorites",
  studied: "ouvir-ingles:v1:studied",
  voice: "ouvir-ingles:v1:voice",
  rate: "ouvir-ingles:v1:rate",
  lastEntry: "ouvir-ingles:v1:last-entry",
  practiceProgress: "ouvir-ingles:v2:practice-progress",
  practiceSettings: "ouvir-ingles:v2:practice-settings",
  audioSettings: "ouvir-ingles:v3:audio-settings",
  storySettings: "ouvir-ingles:v3:story-settings",
  decodingProgress: "ouvir-ingles:v4:decoding-progress",
  decodingSettings: "ouvir-ingles:v4:decoding-settings",
} as const;

export function readStoredSet(key: string): Set<string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

export function writeStoredSet(key: string, value: Set<string>): void {
  localStorage.setItem(key, JSON.stringify([...value]));
}

export function readStoredNumber(key: string, fallback: number): number {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
