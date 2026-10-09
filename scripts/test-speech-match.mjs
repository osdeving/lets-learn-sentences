import assert from "node:assert/strict";
import { compareSpeech, spokenTokens } from "../src/lib/speechMatch.ts";

assert.equal(compareSpeech("Hello, Paul!", "hello paul").exact, true);
assert.equal(compareSpeech("I’m ready. Don't stop!", "I am ready do not stop").exact, true);
assert.equal(compareSpeech("You’ll learn faster, and we’ve started.", "you will learn faster and we have started").exact, true);
assert.equal(compareSpeech("I can't do it.", "I can not do it").exact, true);
assert.equal(compareSpeech("I won't stop", "I will not stop").score, 100);
assert.equal(compareSpeech("Let's try again", "let us try again").exact, true);
assert.deepEqual(spokenTokens("Emily & Paul: a long-term plan."), ["emily", "and", "paul", "a", "long", "term", "plan"]);

const missing = compareSpeech("Learn a little every day", "learn a little day");
assert.deepEqual(missing.missing, ["every"]);
assert.deepEqual(missing.extra, []);
assert.equal(missing.matched, 4);
assert.equal(missing.score, 80);

const extra = compareSpeech("learn every day", "learn a little every day");
assert.deepEqual(extra.extra, ["a", "little"]);
assert.deepEqual(extra.missing, []);
assert.equal(extra.matched, 3);
assert.equal(extra.exact, false);

const changed = compareSpeech("I like learning", "I love learning");
assert.deepEqual(changed.missing, ["like"]);
assert.deepEqual(changed.extra, ["love"]);
assert.equal(changed.matched, 2);
assert.equal(changed.score, 67);

const repeated = compareSpeech("very very good", "very good");
assert.deepEqual(repeated.missing, ["very"]);
assert.equal(repeated.matched, 2);
assert.equal(compareSpeech("Paul likes Emily", "Emily likes Paul").exact, false);
assert.equal(compareSpeech("hello", "").score, 0);
assert.equal(compareSpeech("", "").exact, false);
assert.equal(compareSpeech("hello", "goodbye").score, 0);
assert.deepEqual(spokenTokens("James's book"), ["james's", "book"]);
assert.equal(compareSpeech("James's book", "James book").exact, false);
assert.equal(compareSpeech("I'd like that", "I would like that").exact, false, "Ambiguous 'd is deliberately not expanded.");

console.log("Speech text matching: contractions, punctuation, omissions, additions, substitutions, repetitions and order passed.");
