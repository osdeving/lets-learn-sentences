import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const rows = (await readFile("scripts/tatoeba-selection.tsv", "utf8")).trim().split("\n").map((line) => {
  const [sentenceId, audioId, contributor, english] = line.split("\t");
  return { sentenceId, audioId, contributor, english };
}).filter((row) => {
  try { readFile; execFileSync("test", ["-s", `public/audio/tatoeba/${row.sentenceId}.mp3`]); return true; } catch { return false; }
});

const translations = {
  "9195573": "Eu sabia o que queria dizer, mas não consegui dizer.", "4678282": "Não foi isso que eu disse.",
  "13528379": "Trabalhei por dois anos vendendo livros.", "9695900": "Usei luvas e, mesmo assim, ainda me queimei.",
  "8945367": "Você com certeza vai gostar daqui.", "10523663": "É melhor não dizer nada sobre nenhum dos dois.",
  "9474028": "Não sei como contar a ela.", "10539135": "Eu realmente me diverti na festa dela.",
  "11169922": "Passei a gostar de astronomia por causa do meu par.", "9593201": "Queria que você parasse de zombar de mim.",
  "12203391": "Eu não diria que está errado, mas também não está muito bom.", "10696172": "É um livro de frases e vai ajudar você a se comunicar.",
  "4115821": "Quanto tempo ainda temos?", "9189236": "Embora eu não seja bom nisso, faço questão de dar o meu melhor.",
  "10696176": "Você pode verificar se eles são confiáveis?", "10752856": "Pode ser difícil abrir seu próprio negócio.",
  "239714": "Você não pode retirar o que disse.", "13017214": "Se você não pede nada, não consegue nada.",
  "1420762": "Não tenho notícias dela desde então.", "261258": "Mal consigo entender o que ela diz.",
  "8908795": "Você quer me fazer um favor?", "5353161": "Não posso sair até ele chegar.",
  "12999192": "Há um ônibus a cada quinze minutos.", "12018718": "Dá para saber que está bom só pelo aroma.",
  "11821643": "Você poderia me explicar o significado desta sentença?", "9156440": "Se você não gosta disso, eu paro.",
  "9039976": "Se a Terra fosse plana, os gatos já teriam derrubado tudo dela.",
  "9399856": "Não existe um único jeito certo de aprender. O que funciona melhor para você é o certo para você.",
};

const clean = (value) => value.trim().replace(/^\s+/, "");
const clips = rows.filter((row) => translations[row.sentenceId]).map((row, index) => {
  const whisper = JSON.parse(execFileSync("cat", [`/tmp/tatoeba-whisper/${row.sentenceId}.json`], { encoding: "utf8" }));
  const tokens = whisper.transcription.flatMap((segment) => segment.tokens ?? [])
    .filter((token) => clean(token.text) && !/^(\[|<\|)/.test(clean(token.text)));
  const words = [];
  for (const token of tokens) {
    const timing = { text: clean(token.text), start: token.offsets.from / 1000, end: Math.max(token.offsets.to / 1000, token.offsets.from / 1000 + 0.16) };
    if (words.length && !/^\s/.test(token.text)) {
      words.at(-1).text += timing.text;
      words.at(-1).end = Math.max(words.at(-1).end, timing.end);
    } else words.push(timing);
  }
  const duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", `public/audio/tatoeba/${row.sentenceId}.mp3`], { encoding: "utf8" }).trim());
  return {
    id: `TAT-${String(index + 1).padStart(3, "0")}`, english: row.english, portuguese: translations[row.sentenceId],
    level: index < 8 ? "B1" : index < 18 ? "B2" : index < 25 ? "C1" : "C2",
    audioUrl: `/audio/tatoeba/${row.sentenceId}.mp3`, duration: Number(duration.toFixed(2)),
    tags: [index % 2 ? "fala cotidiana" : "estrutura avançada", row.contributor], words,
    source: {
      publisher: "Tatoeba", title: `Sentence ${row.sentenceId}`, url: `https://tatoeba.org/en/sentences/show/${row.sentenceId}`,
      contributor: row.contributor, license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      textLicense: "CC BY 2.0 FR", textLicenseUrl: "https://creativecommons.org/licenses/by/2.0/fr/",
    },
  };
});
await writeFile("public/data/audio-library.json", `${JSON.stringify({ meta: { title: "Biblioteca de áudio humano", count: clips.length, schemaVersion: 1 }, clips }, null, 2)}\n`);
console.log(`${clips.length} clipes do Tatoeba importados com ${clips.reduce((sum, clip) => sum + clip.words.length, 0)} intervalos de palavra.`);
