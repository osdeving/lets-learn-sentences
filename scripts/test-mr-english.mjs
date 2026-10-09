import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(await readFile('src/lib/mrEnglish.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const scope = { exports: {} };
vm.runInNewContext(source, scope);
const { buildMrEnglishLesson } = scope.exports;

function fixture(texts, intervals) {
  return {
    id: 'test',
    words: texts.map((text, index) => ({
      text,
      start: intervals?.[index]?.[0] ?? index,
      end: intervals?.[index]?.[1] ?? index + 0.5,
    })),
  };
}

const punctuation = buildMrEnglishLesson(fixture([
  'Hi,', 'Mr.', 'English.', 'I’m', 'here!', 'Are', 'you', 'ready?', 'I\'m', 'ready.', 'Last', 'phrase',
]));
assert.deepEqual(Array.from(punctuation.sentences, item => item.text), [
  'Hi, Mr. English.', 'I’m here!', 'Are you ready?', "I'm ready.", 'Last phrase',
], 'Titles must remain attached and the final unpunctuated sentence must be retained');
assert.equal(punctuation.words.filter(item => item.text === "i'm").length, 1, 'Curly and straight apostrophes group the same contraction');
assert.equal(punctuation.words.find(item => item.text === "i'm").occurrences.length, 2);
assert.equal(punctuation.words.find(item => item.text === "i'm").category, 'apostrophes');
assert.equal(punctuation.sentences.find(item => item.text === 'Are you ready?').category, 'questions');

const audible = buildMrEnglishLesson(fixture(['English.', 'ENGLISH!', 'English?'], [[0, 0.02], [1, 1.3], [2, 2.4]]));
assert.equal(audible.words.length, 1, 'Case and surrounding punctuation must not create duplicate vocabulary');
assert.equal(audible.words[0].start, 1, 'A usable original occurrence must replace a 20 ms first occurrence');
assert.equal(audible.words[0].end, 1.3, 'No padding or newly invented word boundaries');
assert.deepEqual(Array.from(audible.words[0].occurrences, item => item.wordIndex), [0, 1, 2]);
const shortOnly = buildMrEnglishLesson(fixture(['yes', 'YES.'], [[0, 0.02], [1, 1.05]]));
assert.equal(shortOnly.words[0].start, 1, 'When all timings are short, choose the longest existing occurrence');

const abbreviations = buildMrEnglishLesson(fixture(['Dr.', 'J.', 'Smith', 'visits', 'the', 'U.S.', 'today.', 'Really?']));
assert.equal(abbreviations.sentences.length, 2);
assert.equal(abbreviations.sentences[0].text, 'Dr. J. Smith visits the U.S. today.');
const symbols = buildMrEnglishLesson(fixture(['20', '%', 'of', 'well-known', 'words.']));
assert.equal(symbols.words.find(item => item.text === '%').category, 'numbers');
assert.equal(symbols.words.find(item => item.text === 'well-known').text, 'well-known');
assert.equal(buildMrEnglishLesson(fixture([])).words.length, 0);
assert.equal(buildMrEnglishLesson(fixture([])).sentences.length, 0);

const library = JSON.parse(await readFile('public/data/audio-library.json', 'utf8'));
const clip = library.clips.find(item => item.id === 'YT-ysxR8IYe4Jo');
assert(clip, 'The imported podcast must exist');
const originalClip = JSON.stringify(clip);
const lesson = buildMrEnglishLesson(clip);
assert.equal(JSON.stringify(clip), originalClip, 'Deriving practice units must never rewrite the imported transcript or its timing');
assert.equal(JSON.stringify(buildMrEnglishLesson(clip)), JSON.stringify(lesson), 'Repeated derivation must keep IDs, ordering and timings stable');
assert.equal(clip.words.length, 1877);
assert.equal(new Set(lesson.words.map(item => item.text)).size, lesson.words.length);
assert.equal(new Set([...lesson.words, ...lesson.sentences].map(item => item.id)).size, lesson.words.length + lesson.sentences.length);

const sentenceIndexes = lesson.sentences.flatMap(item => Array.from(item.occurrences, occurrence => occurrence.wordIndex));
assert.deepEqual(Array.from(sentenceIndexes), clip.words.map((_, index) => index), 'Sentences must cover every original token exactly once and in order');
assert.equal(lesson.sentences.map(item => item.text).join(' '), clip.words.map(item => item.text).join(' '), 'Sentence splitting must preserve all transcript text');
const wordIndexes = lesson.words.flatMap(item => Array.from(item.occurrences, occurrence => occurrence.wordIndex)).sort((a, b) => a - b);
assert.deepEqual(Array.from(wordIndexes), clip.words.map((_, index) => index), 'Vocabulary occurrences must cover all 1,877 original timed tokens, including %');

for (const [units, categories] of [[lesson.words, lesson.wordCategories], [lesson.sentences, lesson.sentenceCategories]]) {
  assert.equal(categories[0].id, 'all');
  assert.equal(new Set(categories.map(item => item.id)).size, categories.length);
  const allowedCategories = new Set(categories.map(item => item.id));
  for (const unit of units) {
    assert(allowedCategories.has(unit.category));
    assert(unit.start >= 0 && unit.end > unit.start && unit.end <= clip.duration);
    assert(unit.occurrences.length > 0);
    for (const occurrence of unit.occurrences) {
      assert.equal(occurrence.start, clip.words[occurrence.wordIndex].start);
      assert.equal(occurrence.end, clip.words[occurrence.wordIndex].end);
    }
  }
}
assert.equal(lesson.sentences[0].text, 'Hi, everyone, and welcome back to Learn with Mr. English.');
const english = lesson.words.find(item => item.text === 'english');
assert(english.end - english.start >= 0.08, 'Repeated English must not use the first 20 ms alignment');

console.log(`Mr. English passed: ${clip.words.length} timed tokens, ${lesson.words.length} unique words, ${lesson.sentences.length} sentences, original intervals, contractions, abbreviations, complete coverage and usable repeated-word selection.`);
console.log('Word categories:', lesson.wordCategories.map(category => `${category.title}=${category.id === 'all' ? lesson.words.length : lesson.words.filter(item => item.category === category.id).length}`).join(', '));
console.log('Sentence categories:', lesson.sentenceCategories.map(category => `${category.title}=${category.id === 'all' ? lesson.sentences.length : lesson.sentences.filter(item => item.category === category.id).length}`).join(', '));
