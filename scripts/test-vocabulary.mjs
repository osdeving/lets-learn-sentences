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
