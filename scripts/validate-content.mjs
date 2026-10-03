import { access, readFile } from "node:fs/promises";

const readJSON = async (path) => JSON.parse(await readFile(path, "utf8"));
const [guide, extras, dialogueData, idiomData, grammarData, advancedData, audioData, storiesData] = await Promise.all([
  readJSON("public/data/sentences.json"),
  readJSON("public/data/extras.json"),
  readJSON("public/data/dialogues.json"),
  readJSON("public/data/idioms.json"),
  readJSON("public/data/grammar.json"),
  readJSON("public/data/advanced.json"),
  readJSON("public/data/audio-library.json"),
  readJSON("public/data/stories.json"),
]);

const fail = (message) => {
  throw new Error(message);
};

if (guide.sentences.length !== 3000) fail("O guia deve conter exatamente 3.000 sentenças");
if (guide.categories.length !== 30) fail("O guia deve conter 30 categorias");
if (guide.situations.length !== 300) fail("O guia deve conter 300 situações");

const expectedIds = Array.from({ length: 3000 }, (_, index) => String(index + 1).padStart(4, "0"));
const guideIds = guide.sentences.map((entry) => entry.id);
if (JSON.stringify(guideIds) !== JSON.stringify(expectedIds)) {
  fail("A sequência de IDs do guia deve ir de 0001 a 3000 sem lacunas");
}

if (extras.sentences.length !== extras.meta.count) fail("A contagem de sentenças novas está incorreta");
if (dialogueData.dialogues.length !== dialogueData.meta.count) fail("A contagem de diálogos está incorreta");
if (dialogueData.dialogues.length < 80) fail("A base expandida deve conter pelo menos 80 diálogos");
if (idiomData.sentences.length !== idiomData.meta.count || idiomData.sentences.length < 120) fail("A base de expressões idiomáticas está incompleta");
if (grammarData.lessons.length !== grammarData.meta.count || grammarData.lessons.length < 36) fail("A base de gramática está incompleta");
if (advancedData.sentences.length !== advancedData.meta.count || advancedData.sentences.length < 120) fail("A base C1/C2 está incompleta");
if (audioData.clips.length !== audioData.meta.count || audioData.clips.length < 25) fail("A biblioteca de áudio humano está incompleta");
if (storiesData.stories.length !== storiesData.meta.count || storiesData.stories.length < 12) fail("A biblioteca de histórias está incompleta");

const allSentences = [...guide.sentences, ...extras.sentences, ...idiomData.sentences, ...advancedData.sentences];
if (new Set(allSentences.map((entry) => entry.id)).size !== allSentences.length) {
  fail("Existem IDs de sentença duplicados");
}

for (const entry of allSentences) {
  for (const field of ["id", "english", "portuguese", "categoryId", "situationId"]) {
    if (typeof entry[field] !== "string" || !entry[field].trim()) {
      fail(`Sentença ${entry.id || "sem ID"} não possui ${field}`);
    }
  }
}

for (const dialogue of dialogueData.dialogues) {
  if (!Array.isArray(dialogue.lines) || dialogue.lines.length < 2) fail(`Diálogo ${dialogue.id} sem falas suficientes`);
  for (const line of dialogue.lines) {
    for (const field of ["speaker", "english", "portuguese"]) {
      if (typeof line[field] !== "string" || !line[field].trim()) {
        fail(`Diálogo ${dialogue.id} possui uma fala sem ${field}`);
      }
    }
  }
  if (!["A1", "A2", "B1", "B2", "C1", "C2"].includes(dialogue.level)) fail(`Diálogo ${dialogue.id} sem nível válido`);
  if (dialogue.audioUrl) {
    if (!dialogue.source?.url || !dialogue.source?.licenseUrl) fail(`Diálogo ${dialogue.id} com áudio sem fonte/licença`);
    await access(`public${dialogue.audioUrl}`);
  }
}

for (const clip of audioData.clips) {
  if (!clip.audioUrl || !clip.source?.url || !clip.source?.contributor || !clip.source?.licenseUrl) fail(`Áudio ${clip.id} sem fonte completa`);
  if (!Array.isArray(clip.words) || clip.words.length < 2) fail(`Áudio ${clip.id} sem alinhamento por palavra`);
  if (clip.words.some((word) => !word.text || word.end <= word.start)) fail(`Áudio ${clip.id} possui intervalo de palavra inválido`);
  await access(`public${clip.audioUrl}`);
}

for (const story of storiesData.stories) {
  if (!Array.isArray(story.segments) || story.segments.length < 5) fail(`História ${story.id} curta ou vazia`);
  if (story.audioUrl) {
    if (!story.source?.url || !story.source?.licenseUrl) fail(`História ${story.id} com áudio sem fonte/licença`);
    await access(`public${story.audioUrl}`);
    if (story.segments.some((segment) => segment.audioStart === undefined || segment.audioEnd <= segment.audioStart)) fail(`História ${story.id} sem intervalos válidos`);
  }
}

for (const lesson of grammarData.lessons) {
  for (const field of ["id", "level", "title", "summary", "pattern", "listeningTip", "commonMistake", "sourceUrl"]) {
    if (typeof lesson[field] !== "string" || !lesson[field].trim()) fail(`Lição ${lesson.id || "sem ID"} não possui ${field}`);
  }
  if (!Array.isArray(lesson.examples) || lesson.examples.length < 2) fail(`Lição ${lesson.id} sem exemplos suficientes`);
}

console.log(
  `Conteúdo válido: ${allSentences.length} sentenças, ${guide.categories.length} categorias, ` +
    `${guide.situations.length + idiomData.situations.length} situações, ${dialogueData.dialogues.length} diálogos, ` +
    `${idiomData.sentences.length} expressões, ${grammarData.lessons.length} lições, ${audioData.clips.length} áudios humanos e ${storiesData.stories.length} histórias.`,
);

const decoding = await readJSON('public/data/decoding.json');
if (decoding.lessons.length !== 24 || new Set(decoding.lessons.map(l=>l.week)).size !== 8) fail('A trilha deve ter 24 lições em oito semanas');
const ids=new Set(decoding.clips.map(c=>c.id));
if(ids.size!==decoding.clips.length)fail('Microclipes duplicados');
const errors=['boundary','reduction','vocabulary','recognition','contraction','linking','weak-form','phoneme','speed'];
const trained=new Set(decoding.lessons.flatMap(l=>l.clipIds));
for(const lesson of decoding.lessons){
  if(lesson.clipIds.length<3||lesson.clipIds.some(id=>!ids.has(id)))fail(`Lição ${lesson.id} com referências inválidas`);
  if(!lesson.transferIds.length||lesson.transferIds.some(id=>!ids.has(id)||trained.has(id)))fail(`Lição ${lesson.id}: transferência deve usar trechos reservados`);
  if(lesson.pairIds.some(id=>!decoding.pairs.some(p=>p.id===id)))fail(`Lição ${lesson.id} com contraste inválido`);
  if(lesson.focus.some(f=>!errors.includes(f)))fail(`Foco inválido em ${lesson.id}`);
}
for(const clip of decoding.clips){
  if(!(clip.start>=0 && clip.end>clip.start))fail(`Intervalo inválido: ${clip.id}`);
  if(!clip.english||!clip.portuguese||!clip.speaker||!clip.note||!clip.source?.licenseUrl||!clip.source?.contributor)fail(`Microclipe incompleto: ${clip.id}`);
  if(!clip.words.length||clip.words.some((w,i)=>w.start<clip.start||w.end>clip.end+.001||w.end<=w.start||(i&&w.start<clip.words[i-1].start)))fail(`Palavras fora de ordem ou do intervalo: ${clip.id}`);
  await access(`public${clip.audioUrl}`);
}
for(const pair of decoding.pairs){
  if(pair.words.length!==2)fail(`Contraste inválido: ${pair.id}`);
  for(const word of pair.words){if(!word.source?.license||!word.source?.contributor||!word.source?.url)fail(`Crédito incompleto: ${word.text}`);await access(`public${word.audioUrl}`);}
}
console.log(`Método válido: ${decoding.lessons.length} lições, ${decoding.clips.length} microclipes, ${decoding.pairs.length} contrastes; transferência reservada e créditos preservados.`);

const humanSources = await readJSON("public/data/human-sources.json");
if (new Set(humanSources.map(item => item.id)).size !== humanSources.length) fail("Catálogo humano possui IDs duplicados");
const sourceHosts = { ELLLO: "elllo.org", "British Council": "learnenglish.britishcouncil.org", ESLPod: "www.eslpod.com" };
for (const item of humanSources) {
  if (!item.id || !item.title || !["A1", "A2", "B1", "B2", "C1", "Livre"].includes(item.level)) fail(`Recurso humano inválido: ${item.id}`);
  if (new URL(item.pageUrl).protocol !== "https:" || new URL(item.pageUrl).hostname !== sourceHosts[item.provider]) fail(`Página fora da fonte oficial: ${item.id}`);
  if (item.embedUrl && (item.provider !== "ELLLO" || new URL(item.embedUrl).hostname !== "w.soundcloud.com" || !new URL(item.embedUrl).searchParams.get("url")?.startsWith("https://api.soundcloud.com/tracks/"))) fail(`Áudio externo inesperado: ${item.id}`);
}
console.log(`Catálogo humano válido: ${humanSources.filter(item => item.embedUrl).length} players oficiais e ${humanSources.filter(item => !item.embedUrl).length} acessos oficiais.`);
