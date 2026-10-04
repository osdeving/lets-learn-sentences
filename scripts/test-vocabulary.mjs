import assert from "node:assert/strict";
import fs from "node:fs";
import {
  filterVocabulary,
  vocabularyQueue,
  reviewChoices,
  entryFromHash,
} from "../src/vocabulary/model.ts";
import { validateVocabulary } from "./validate-vocabulary.mjs";
const data = JSON.parse(
  fs.readFileSync(
    new URL("../public/data/vocabulary/catalog.json", import.meta.url),
  ),
);
const grammar = JSON.parse(
  fs.readFileSync(new URL("../public/data/grammar.json", import.meta.url)),
);
const ids = new Set(grammar.lessons.map((e) => e.id));
const defaults = {
  category: "all",
  group: "all",
  frequency: "all",
  query: "",
  savedOnly: false,
  saved: new Set(),
};
assert.deepEqual(validateVocabulary(data, ids), []);
assert(
  filterVocabulary(data, { ...defaults, query: "pe" }).some(
    (e) => e.id === "foot",
  ),
);
assert(
  filterVocabulary(data, { ...defaults, query: "tap" }).some(
    (e) => e.id === "faucet",
  ),
);
assert(
  filterVocabulary(data, {
    ...defaults,
    category: "body",
    group: "feet",
  }).every((e) => e.category === "body" && e.group === "feet"),
);
assert.deepEqual(
  filterVocabulary(data, {
    ...defaults,
    savedOnly: true,
    saved: new Set(["mug"]),
  }).map((e) => e.id),
  ["mug"],
);
const mug = data.entries.find((e) => e.id === "mug");
const list = vocabularyQueue(
  [{ ...mug, audioUrl: "/audio/mug.mp3" }],
  true,
  "/lets-learn-sentences/",
);
assert.equal(list[0].audioUrl, "/lets-learn-sentences/audio/mug.mp3");
assert.equal(list[1].text, mug.examples[0].en);
assert.equal(vocabularyQueue([mug], false, "/").length, 1);
const choices = reviewChoices(data.entries, mug, () => 0.4);
assert.equal(choices.length, 4);
assert.equal(new Set(choices.map((e) => e.pt)).size, 4);
assert(choices.includes(mug));
assert.equal(reviewChoices([mug], mug).length, 1);
assert.equal(entryFromHash("#vocabulary/big-toe"), "big-toe");
assert.equal(entryFromHash("#vocabulary/%zz"), undefined);
for (const mutate of [
  (d) => d.entries.push(d.entries[0]),
  (d) => (d.entries[0].category = "missing"),
  (d) => (d.entries[0].related = ["missing"]),
  (d) => delete d.entries[0].pronunciation,
  (d) => (d.entries[0].audioUrl = "/missing.mp3"),
]) {
  const copy = structuredClone(data);
  mutate(copy);
  assert(validateVocabulary(copy, ids).length > 0);
}
const extended = structuredClone(data);
extended.categories.push({ ...data.categories[0], id: "new-world" });
const {
  variants,
  notes,
  chunks,
  related,
  grammar: g,
  image,
  plural,
  sources,
  tags,
  ...minimal
} = mug;
extended.entries.push({
  ...minimal,
  id: "new-word",
  category: "new-world",
  group: "feet",
});
assert.deepEqual(validateVocabulary(extended, ids), []);
console.log(
  "Vocabulary: search, filters, queue, quiz, links, schema and extension tests passed.",
);

const { vocabularySegments } = await import("../src/vocabulary/model.ts");
const word = (id) => data.entries.find((e) => e.id === id);
assert.deepEqual(
  vocabularySegments("My phone is next to the headphones.", [word("phone")])
    .filter((x) => x.entry)
    .map((x) => x.text),
  ["phone"],
);
assert.deepEqual(
  vocabularySegments("The remote control is here.", [word("remote-control")])
    .filter((x) => x.entry)
    .map((x) => x.entry.id),
  ["remote-control"],
);
assert.deepEqual(
  vocabularySegments("Curtains and feet.", [word("curtain"), word("foot")])
    .filter((x) => x.entry)
    .map((x) => x.entry.id),
  ["curtain", "foot"],
);
assert.equal(
  vocabularySegments("Nothing is linked.", [])
    .map((x) => x.text)
    .join(""),
  "Nothing is linked.",
);
const sample = "My phone, my earbuds, and the curtains.";
assert.equal(
  vocabularySegments(sample, [word("phone"), word("earbuds"), word("curtain")])
    .map((x) => x.text)
    .join(""),
  sample,
);
for (const mutate of [
  (d) => d.stories[0].scenes[0].words.push("missing-word"),
  (d) => (d.stories[0].scenes[0].lines[0].speaker = "Unknown"),
  (d) => d.stories[0].scenes.push(d.stories[0].scenes[0]),
  (d) => delete d.stories[0].scenes[0].lines[0].pt,
]) {
  const copy = structuredClone(data);
  mutate(copy);
  assert(validateVocabulary(copy, ids).length > 0);
}
console.log(
  "Stories: linked words, whole-word boundaries, plurals, preserved text, references and speakers passed.",
);
const { storyListeningQueue } = await import("../src/vocabulary/model.ts");
const story = data.stories[0],
  scene = story.scenes[0];
const sceneQueue = storyListeningQueue(story, scene.id, false, "/app/");
assert.equal(sceneQueue.length, scene.lines.length + 1);
assert.equal(sceneQueue[0].text, scene.setting.en);
assert.equal(sceneQueue[1].text, scene.lines[0].en);
const allQueue = storyListeningQueue(story, scene.id, true, "/app/");
assert.equal(
  allQueue.length,
  story.scenes.reduce((n, s) => n + s.lines.length + 1, 0),
);
assert.equal(new Set(allQueue.map((x) => x.id)).size, allQueue.length);
assert.equal(allQueue[sceneQueue.length].id, story.scenes[1].id + ":setting");
assert.notEqual(sceneQueue[1].alternate, sceneQueue[2].alternate);
const recorded = structuredClone(story);
recorded.scenes[0].lines[0].audioUrl = "/audio/line.mp3";
assert.equal(
  storyListeningQueue(recorded, scene.id, false, "/app/")[1].audioUrl,
  "/app/audio/line.mp3",
);
console.log(
  "Story queue: scene scope, complete narrative, transitions, voice alternation and recording paths passed.",
);
