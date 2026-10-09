export interface SpeechAlignmentWord {
  kind: "matched" | "missing" | "extra" | "changed";
  expected?: string;
  heard?: string;
}

export interface SpeechMatch {
  expectedTokens: string[];
  heardTokens: string[];
  alignment: SpeechAlignmentWord[];
  missing: string[];
  extra: string[];
  matched: number;
  score: number;
  exact: boolean;
}

const contractions: Record<string, string> = {
  "i'm": "i am", "you're": "you are", "we're": "we are", "they're": "they are",
  "it's": "it is", "he's": "he is", "she's": "she is", "that's": "that is",
  "there's": "there is", "here's": "here is", "what's": "what is",
  "who's": "who is", "where's": "where is", "how's": "how is",
  "i've": "i have", "you've": "you have", "we've": "we have", "they've": "they have",
  "i'll": "i will", "you'll": "you will", "he'll": "he will", "she'll": "she will",
  "it'll": "it will", "we'll": "we will", "they'll": "they will",
  "can't": "cannot", "won't": "will not", "shan't": "shall not", "let's": "let us",
};

/** Text matching only: this does not measure voice similarity or pronunciation. */
export function spokenTokens(value: string): string[] {
  const cleaned = value.normalize("NFKC").toLowerCase()
    .replace(/[‘’`]/g, "'").replace(/&/g, " and ")
    .replace(/\bcan not\b/g, "cannot")
    .replace(/\b[a-z]+(?:'[a-z]+)+\b/g, (word) => {
      if (contractions[word]) return contractions[word];
      if (word.endsWith("n't")) return `${word.slice(0, -3)} not`;
      return word;
    });
  return cleaned.match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) ?? [];
}

/** Levenshtein alignment preserves order and counts repeated words separately. */
export function compareSpeech(expected: string, heard: string): SpeechMatch {
  const expectedTokens = spokenTokens(expected);
  const heardTokens = spokenTokens(heard);
  const rows = expectedTokens.length + 1;
  const columns = heardTokens.length + 1;
  const costs = Array.from({ length: rows }, () => new Uint32Array(columns));
  for (let row = 0; row < rows; row += 1) costs[row][0] = row;
  for (let column = 0; column < columns; column += 1) costs[0][column] = column;
  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const changed = expectedTokens[row - 1] !== heardTokens[column - 1];
      costs[row][column] = Math.min(
        costs[row - 1][column] + 1,
        costs[row][column - 1] + 1,
        costs[row - 1][column - 1] + Number(changed),
      );
    }
  }
  const alignment: SpeechAlignmentWord[] = [];
  let row = rows - 1;
  let column = columns - 1;
  while (row || column) {
    const equal = row > 0 && column > 0 && expectedTokens[row - 1] === heardTokens[column - 1];
    if (equal && costs[row][column] === costs[row - 1][column - 1]) {
      alignment.push({ kind: "matched", expected: expectedTokens[--row], heard: heardTokens[--column] });
    } else if (row && costs[row][column] === costs[row - 1][column] + 1) {
      alignment.push({ kind: "missing", expected: expectedTokens[--row] });
    } else if (column && costs[row][column] === costs[row][column - 1] + 1) {
      alignment.push({ kind: "extra", heard: heardTokens[--column] });
    } else {
      alignment.push({ kind: "changed", expected: expectedTokens[--row], heard: heardTokens[--column] });
    }
  }
  alignment.reverse();
  const distance = costs[rows - 1][columns - 1];
  const length = Math.max(expectedTokens.length, heardTokens.length);
  return {
    expectedTokens, heardTokens, alignment,
    missing: alignment.flatMap((word) => word.kind === "missing" || word.kind === "changed" ? [word.expected!] : []),
    extra: alignment.flatMap((word) => word.kind === "extra" || word.kind === "changed" ? [word.heard!] : []),
    matched: alignment.filter((word) => word.kind === "matched").length,
    score: length ? Math.round(100 * (1 - distance / length)) : 0,
    exact: Boolean(expectedTokens.length) && distance === 0,
  };
}
