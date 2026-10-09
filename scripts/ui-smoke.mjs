import { writeFile } from "node:fs/promises";

const targets = await fetch("http://127.0.0.1:9222/json/new?http://127.0.0.1:5173/", { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(targets.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
socket.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  if (!payload.id) return;
  const entry = pending.get(payload.id);
  if (!entry) return;
  pending.delete(payload.id);
  if (payload.error) entry.reject(new Error(`${entry.method}: ${payload.error.message}`));
  else entry.resolve(payload.result);
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject, method });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  let result;
  try { result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); }
  catch (error) { throw new Error(`${error.message}\nExpression: ${expression.slice(0, 300)}`); }
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression, timeout = 6000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Tempo esgotado: ${expression}`);
};
const shot = async (name) => {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(`/tmp/${name}.png`, Buffer.from(result.data, "base64"));
};
const clickTab = async (label) => {
  await evaluate(`(() => { const b = [...document.querySelectorAll('.tab')].find(x => x.textContent.includes(${JSON.stringify(label)})); if (!b) return false; b.click(); return true; })()`);
};

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await evaluate(`(async () => {
  localStorage.clear();
  for (const key of await caches.keys()) await caches.delete(key);
  for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
  location.reload();
})()`);
await waitFor("Boolean(document.querySelector('.decoding-coach'))");
await clickTab("Sentenças");
await waitFor("document.querySelector('.sentence-card') && document.body.innerText.includes('3.274')");
await shot("ouvir-main");

await clickTab("Diálogos");
await waitFor("document.querySelector('.dialogue-view') && document.body.innerText.includes('82 diálogos')");
await evaluate("document.querySelector('.check-row input').click()");
await waitFor("document.body.innerText.includes('3 diálogos')");
await shot("ouvir-dialogues");

await clickTab("Treino");
await waitFor("Boolean(document.querySelector('.practice-card'))");
const aidState = await evaluate("[...document.querySelectorAll('.practice-settings .aid-toggle input')].map(x => x.checked)");
if (aidState.slice(0, 4).some(Boolean) || aidState[4] !== true) throw new Error("As pistas devem iniciar fechadas e o fluxo contínuo ligado");
await evaluate(`(() => { const ta=document.querySelector('.dictation-area textarea'); const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set; setter.call(ta,'wrong answer'); ta.dispatchEvent(new Event('input',{bubbles:true})); return true; })()`);
await new Promise((resolve) => setTimeout(resolve, 100));
await evaluate("document.querySelector('.check-answer').click()");
await waitFor("Boolean(document.querySelector('.practice-card.wrong'))");
await new Promise((resolve) => setTimeout(resolve, 100));
await evaluate("document.querySelector('.check-answer').click()");
await waitFor("document.body.innerText.includes('Último recurso: revelar transcrição')");
await evaluate("[...document.querySelectorAll('button')].find(x => x.textContent.includes('Último recurso')).click()");
await shot("ouvir-practice");

await clickTab("Áudios");
await waitFor("document.querySelector('.audio-lab') && document.body.innerText.includes('29 clipes')");
await evaluate("document.querySelector('.human-transcript > button')?.click()");
await waitFor("document.querySelectorAll('.human-transcript p button').length > 2");
await shot("ouvir-human-audio");

await clickTab("Histórias");
await waitFor("document.querySelector('.stories-view') && document.body.innerText.includes('Short stories')");
await evaluate("[...document.querySelectorAll('.story-list button')].find(x => x.textContent.includes('The Gift of the Magi')).click()");
await waitFor("document.body.innerText.includes('Domínio público')");
await shot("ouvir-stories");

await clickTab("Gramática");
await waitFor("document.querySelector('.grammar-card') && document.body.innerText.includes('Verb to be')");
await shot("ouvir-grammar");
await evaluate(`(() => { const s=document.querySelector('.grammar-nav select'); s.value='C2'; s.dispatchEvent(new Event('change',{bubbles:true})); })()`);
await waitFor("document.body.innerText.includes('Elipse e substituição')");

await clickTab("Sentenças");
await waitFor("Boolean(document.querySelector('.sentence-card'))");
await evaluate(`(() => { const selects=document.querySelectorAll('.controls-panel select'); selects[0].value='natural'; selects[0].dispatchEvent(new Event('change',{bubbles:true})); })()`);
await waitFor("[...document.querySelectorAll('.controls-panel select')[1].options].some(x => x.value === '31')");
await evaluate(`(() => { const s=document.querySelectorAll('.controls-panel select')[1]; s.value='31'; s.dispatchEvent(new Event('change',{bubbles:true})); })()`);
await waitFor("document.body.innerText.includes('Expressões populares e idiomáticas') && document.body.innerText.includes('Ao pé da letra')");
await shot("ouvir-idioms");

await evaluate(`(() => { const selects=document.querySelectorAll('.controls-panel select'); selects[0].value='advanced'; selects[0].dispatchEvent(new Event('change',{bubbles:true})); })()`);
await waitFor("document.body.innerText.includes('C1 · Nuance') || document.body.innerText.includes('Nuance e argumentação')");

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await clickTab("Treino");
await waitFor("Boolean(document.querySelector('.practice-card'))");
await shot("ouvir-mobile");

const summary = await evaluate(`({
  title: document.title,
  tabs: [...document.querySelectorAll('.tab')].map(x => x.textContent.trim()),
  hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  practiceStored: Boolean(localStorage.getItem('ouvir-ingles:v2:practice-progress'))
})`);
console.log(JSON.stringify(summary, null, 2));
socket.close();
