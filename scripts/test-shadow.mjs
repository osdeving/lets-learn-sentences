import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

async function load(file, dependencies = {}, globals = {}) {
  const source = ts.transpileModule(await readFile(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const scope = { exports: {}, require: name => { assert(name in dependencies, `Unexpected dependency ${name}`); return dependencies[name]; }, ...globals };
  vm.runInNewContext(source, scope);
  return scope.exports;
}

function hooks() {
  const slots = []; let cursor = 0; let effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  return {
    begin() { cursor = 0; effects = []; },
    flush() { for (const effect of effects) effect(); },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
    react: {
      useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
      useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
      useCallback(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { fn, deps }; return slots[i].fn; },
      useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); },
    },
  };
}

function clock() {
  let id = 0, now = 0; const jobs = new Map(), listeners = new Map();
  return {
    setTimeout(fn, delay) { jobs.set(++id, { fn, at: now + delay }); return id; },
    clearTimeout(key) { jobs.delete(key); },
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
    dispatch(name) { for (const fn of listeners.get(name) ?? []) fn(); },
    advance(milliseconds) {
      const end = now + milliseconds;
      while (true) {
        const next = [...jobs].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        now = next[1].at; jobs.delete(next[0]); next[1].fn();
      }
      now = end;
    },
    get now() { return now; },
    get size() { return jobs.size; },
  };
}

const math = await load('src/lib/shadow.ts');
const defaults = math.normalizeShadowSettings({});
assert.equal(math.shadowPauseSeconds({ id: 'word', start: 10, end: 10.2 }, defaults), 2, 'Short words need the minimum repeat pause');
assert.equal(math.shadowPauseSeconds({ id: 'sentence', start: 10, end: 14 }, defaults), 7, 'Sentences use their own duration');
assert.equal(math.shadowPauseSeconds({ id: 'sentence', start: 10, end: 14, rate: 0.5 }, defaults), 13, 'Slower playback needs a proportionally longer repeat pause');
assert.equal(math.shadowPauseSeconds({ id: 'sentence', start: 10, end: 14, rate: 2 }, defaults), 4);
assert.equal(math.shadowPauseSeconds({ id: 'sentence', start: 10, end: 14 }, { ...defaults, overrides: { sentence: 3 } }), 3, 'A personal sentence override replaces the automatic pause');
assert.equal(math.shadowPauseSeconds({ id: 'word', start: 10, end: 10.2 }, { ...defaults, overrides: { word: 0 } }), 0, 'An explicit zero-second override is supported');
assert.equal(math.shadowPauseSeconds({ id: 'invalid-rate', start: 0, end: 2, rate: -1 }, defaults), 4);
const invalid = math.normalizeShadowSettings({ repeats: 1.5, gap: Infinity, pauseFactor: -1, extraPause: '7', minimumPause: NaN, continuous: 'false', loop: 1, overrides: { valid: 5, negative: -1, enormous: 301, invalid: '4' } });
assert.equal(invalid.repeats, 2); assert.equal(invalid.gap, 400); assert.equal(invalid.pauseFactor, 1.5); assert.equal(invalid.minimumPause, 2); assert.equal(invalid.continuous, true); assert.equal(invalid.loop, false);
assert.deepEqual(Object.keys(invalid.overrides), ['valid']);
assert.deepEqual(Object.keys(math.normalizeShadowSettings(JSON.parse('{"overrides":{"__proto__":2,"constructor":2,"safe":3}}')).overrides), ['safe']);

const wav = await readFile('public/audio/prompts/repeat-please.wav');
assert.equal(wav.toString('ascii', 0, 4), 'RIFF'); assert.equal(wav.toString('ascii', 8, 12), 'WAVE'); assert(wav.length > 10000, 'The prompt must contain real audio');

const h = hooks(), time = clock(), calls = [], selections = [], stored = new Map();
let playerError = '', stops = 0;
const native = {
  stop() { stops++; },
  get error() { return playerError; },
  position: 0,
  play(url, start, end, options) { calls.push({ url, start, end, options, at: time.now }); return Promise.resolve(); },
};
const module = await load('src/hooks/useShadowQueue.ts', { react: h.react, '../lib/shadow': math, './useClipPlayer': { useClipPlayer: () => native } }, {
  window: time,
  Date: { now: () => time.now },
  localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) },
});
const items = [{ id: 'word', text: 'Learn', audioUrl: '/podcast.mp3', start: 1, end: 1.2 }, { id: 'sentence', text: 'Learn every day.', audioUrl: '/podcast.mp3', start: 2, end: 6, rate: 0.5 }];
function render(list = items, storageKey = 'shadow') { h.begin(); const queue = module.useShadowQueue(list, storageKey, index => selections.push(index)); h.flush(); return queue; }
let queue = render();
queue.start(); assert.equal(calls.length, 1); assert.equal(render().phase, 'listen');
calls.at(-1).options.onComplete(); time.advance(399); assert.equal(calls.length, 1); time.advance(1); assert.equal(calls.length, 2); assert.equal(render().repetition, 2);
calls.at(-1).options.onComplete(); assert.equal(calls.at(-1).url, math.SHADOW_PROMPT_PATH); assert.equal(calls.at(-1).options.rate, 1); assert.equal(render().phase, 'prompt');
time.advance(5000); assert.equal(calls.length, 3, 'The repeat countdown must wait until the actual prompt finishes');
calls.at(-1).options.onComplete(); queue = render(); assert.equal(queue.phase, 'repeat'); assert.equal(queue.remaining, 2);
time.advance(1999); assert.equal(calls.length, 3); time.advance(1); assert.equal(calls.length, 4); assert.equal(calls.at(-1).start, 2); assert.equal(calls.at(-1).options.rate, 0.5);
calls.at(-1).options.onComplete(); time.advance(400); calls.at(-1).options.onComplete(); assert.equal(calls.length, 6); calls.at(-1).options.onComplete(); assert.equal(render().remaining, 13);
time.advance(12999); assert.equal(render().running, true); time.advance(1); queue = render(); assert.equal(queue.running, false); assert.equal(queue.phase, 'idle'); assert.equal(time.size, 0);
assert.deepEqual(selections, [0, 1]); assert.deepEqual(calls.map(call => call.url), ['/podcast.mp3', '/podcast.mp3', math.SHADOW_PROMPT_PATH, '/podcast.mp3', '/podcast.mp3', math.SHADOW_PROMPT_PATH]);

// Stops cancel both delayed repetitions and late callbacks from playback.
queue.start(); calls.at(-1).options.onComplete(); const stoppedAt = calls.length; queue.stop(); time.advance(10000); assert.equal(calls.length, stoppedAt);
queue.start(); const pendingCompletion = calls.at(-1).options.onComplete; queue.stop(); pendingCompletion(); time.advance(10000); assert.equal(calls.length, stoppedAt + 1);

// Personal pauses survive storage, and zero means immediate advance after the prompt.
queue.configure({ repeats: 1, overrides: { word: 0, sentence: 4 } }); queue = render();
assert.equal(JSON.parse(stored.get('shadow')).overrides.sentence, 4); assert.equal(queue.settings.minimumPause, 2, 'Partial settings preserve other preferences');
queue.start(); calls.at(-1).options.onComplete(); calls.at(-1).options.onComplete(); assert.equal(calls.at(-1).start, 2); queue.stop();

// Replacing a filter list, changing configuration, navigation and unmount never resume the old sequence.
const replacement = [{ ...items[0], id: 'other' }];
queue.start(); calls.at(-1).options.onComplete(); const oldPrompt = calls.at(-1).options.onComplete; render(replacement); const filteredAt = calls.length; oldPrompt(); time.advance(10000); assert.equal(calls.length, filteredAt);
queue = render(); queue.start(); calls.at(-1).options.onComplete(); calls.at(-1).options.onComplete(); queue.configure({ repeats: 3 }); time.advance(10000); assert.equal(time.size, 0);
queue = render(); queue.start(); time.dispatch('hashchange'); const navigatedAt = calls.length; calls.at(-1).options.onComplete(); time.advance(10000); assert.equal(calls.length, navigatedAt); assert.equal(render().running, false);
queue = render(); queue.start(); const unmountedCompletion = calls.at(-1).options.onComplete; h.unmount(); unmountedCompletion(); time.advance(10000); assert.equal(calls.length, navigatedAt + 1);

// Loop and a single-item cycle are explicit choices.
queue = render(); queue.configure({ repeats: 1, loop: true, overrides: { word: 0, sentence: 0 } }); queue = render(); queue.start(1); calls.at(-1).options.onComplete(); calls.at(-1).options.onComplete(); assert.equal(calls.at(-1).start, 1); queue.stop();
queue.configure({ continuous: false }); queue = render(); queue.start(); calls.at(-1).options.onComplete(); calls.at(-1).options.onComplete(); assert.equal(render().running, false);

// Invalid media and changed storage keys remain recoverable.
queue = render(); queue.start(); playerError = 'Áudio indisponível'; queue = render(); assert.equal(render().error, playerError); assert.equal(render().running, false); playerError = '';
stored.set('different', JSON.stringify({ repeats: 4, gap: 700 })); render(items, 'different'); queue = render(items, 'different'); assert.equal(queue.settings.repeats, 4); assert.equal(queue.settings.gap, 700);
const missing = [{ id: 'missing', text: 'No recording' }]; queue = render(missing); queue.start(); queue = render(missing); assert.equal(queue.running, false); assert(queue.error.includes('não tem um áudio')); assert(stops > 0);

console.log('Shadow passed: proportional pauses, speed, per-item overrides, persisted validation, excerpt repeats → fixed prompt → timed response → advance, stop/filter/settings/navigation/unmount cancellation and media errors.');
