export interface ShadowSettings {
  repeats: number;
  gap: number;
  pauseFactor: number;
  extraPause: number;
  minimumPause: number;
  continuous: boolean;
  loop: boolean;
  overrides: Record<string, number>;
}

export const DEFAULT_SHADOW_SETTINGS: ShadowSettings = {
  repeats: 2,
  gap: 400,
  pauseFactor: 1.5,
  extraPause: 1,
  minimumPause: 2,
  continuous: true,
  loop: false,
  overrides: {},
};

// Generated locally with FFmpeg's Flite filter and the CMU slt voice.
// No API key or metered text-to-speech service is used for this prompt.
export const SHADOW_PROMPT_PATH = "audio/prompts/repeat-please.wav";

function bounded(value: unknown, fallback: number, maximum: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum ? value : fallback;
}

export function normalizeShadowSettings(value: unknown): ShadowSettings {
  const stored = value && typeof value === "object" ? value as Partial<ShadowSettings> : {};
  const overrides: Record<string, number> = {};
  if (stored.overrides && typeof stored.overrides === "object" && !Array.isArray(stored.overrides)) {
    for (const [id, seconds] of Object.entries(stored.overrides)) {
      if (id && id !== "__proto__" && id !== "constructor" && id !== "prototype" && typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0 && seconds <= 300) overrides[id] = seconds;
    }
  }
  return {
    repeats: typeof stored.repeats === "number" && Number.isInteger(stored.repeats) && stored.repeats >= 1 && stored.repeats <= 20 ? stored.repeats : DEFAULT_SHADOW_SETTINGS.repeats,
    gap: bounded(stored.gap, DEFAULT_SHADOW_SETTINGS.gap, 10000),
    pauseFactor: bounded(stored.pauseFactor, DEFAULT_SHADOW_SETTINGS.pauseFactor, 10),
    extraPause: bounded(stored.extraPause, DEFAULT_SHADOW_SETTINGS.extraPause, 300),
    minimumPause: bounded(stored.minimumPause, DEFAULT_SHADOW_SETTINGS.minimumPause, 300),
    continuous: typeof stored.continuous === "boolean" ? stored.continuous : DEFAULT_SHADOW_SETTINGS.continuous,
    loop: typeof stored.loop === "boolean" ? stored.loop : DEFAULT_SHADOW_SETTINGS.loop,
    overrides,
  };
}

export function shadowPauseSeconds(item: { id: string; start?: number; end?: number; rate?: number }, settings: ShadowSettings) {
  const config = normalizeShadowSettings(settings);
  const override = config.overrides[item.id];
  if (typeof override === "number") return override;
  const start = typeof item.start === "number" && Number.isFinite(item.start) ? item.start : 0;
  const end = typeof item.end === "number" && Number.isFinite(item.end) ? item.end : start + 1;
  const duration = Math.max(0, end - start);
  const rate = typeof item.rate === "number" && Number.isFinite(item.rate) && item.rate > 0 ? item.rate : 1;
  return Math.max(config.minimumPause, duration / rate * config.pauseFactor + config.extraPause);
}
