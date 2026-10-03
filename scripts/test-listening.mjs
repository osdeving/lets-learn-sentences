import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';

await mkdir('/tmp/ouvir-listening-tests',{recursive:true});
for(const name of ['storage','decoding']){
  const source=await readFile(`src/lib/${name}.ts`,'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace('"./storage"','"./storage.mjs"');
  await writeFile(`/tmp/ouvir-listening-tests/${name}.mjs`,output);
}
const {compareDictation,scheduleReview,DAY,adaptiveClips,validateProgress,freshProgress}=await import(pathToFileURL('/tmp/ouvir-listening-tests/decoding.mjs'));
assert.equal(compareDictation("I couldn't say it.",'I could not say it').score,100);
assert.equal(compareDictation("I can't leave.",'I cannot leave').score,100);
assert.equal(compareDictation("We're going to stay home.",'we are gonna stay home').score,100);
assert.equal(compareDictation("I would've told you if I'd known.","I told you if I know").score<70,true);
assert.equal(compareDictation("I've had it for three years.",'I have had it for three years').score,100);
assert.equal(compareDictation("I'd love to go.",'I would love to go').score,100);
assert.equal(compareDictation("I'd known.",'I had known').score,100);
assert.equal(compareDictation("It's been a while.",'It has been a while').score,100);
assert.equal(compareDictation('That is not what I said.','That is what I said.').tokens.some(t=>t.kind==='missing'&&t.expected==='not'),true);
assert.equal(compareDictation('I know.','I really know.').tokens.some(t=>t.kind==='extra'),true);
assert.equal(compareDictation('','').score,0);
const now=Date.UTC(2026,9,3,17);
const first=scheduleReview(undefined,100,'easy',now);
assert.equal(first.interval,1);assert.equal(first.reviews,0);
const today=scheduleReview(first,100,'easy',now+60000);
assert.equal(today.interval,1);assert.equal(today.reviews,0);assert.equal(today.delayedScore,undefined);
const delayed=scheduleReview(first,100,'easy',now+DAY);
assert.equal(delayed.interval,3);assert.equal(delayed.reviews,1);assert.equal(delayed.delayedScore,100);
const merelyStudied=scheduleReview(first,100,'easy',now+DAY,false);
assert.equal(merelyStudied.interval,1);assert.equal(merelyStudied.delayedScore,undefined);
const failed=scheduleReview(delayed,20,'again',now+4*DAY);
assert.equal(failed.interval,0);assert.equal(failed.due,now+4*DAY+600000);
assert.equal(failed.lapses,1);
const p=freshProgress();
p.attempts=[{errors:['weak-form']}];
const rank=adaptiveClips([{id:'a',focus:['phoneme'],speaker:'a'},{id:'b',focus:['weak-form'],speaker:'b'}],p);
assert.equal(rank[0].id,'b');assert.equal(adaptiveClips(rank,p,'a').length,1);
assert.throws(()=>validateProgress({version:1}));
assert.deepEqual(validateProgress(freshProgress()).completedLessons,[]);

const worker=await readFile('public/sw.js','utf8');
const listeners={};
const scope={self:{addEventListener(name,listener){listeners[name]=listener;},location:{origin:'http://localhost',href:'http://localhost/sw.js'},skipWaiting:async()=>{},clients:{claim:async()=>{}}},URL,Response,Headers,console,crypto:webcrypto};
vm.createContext(scope);vm.runInContext(worker,scope);
const sample=()=>new Response(Uint8Array.from([0,1,2,3,4,5,6,7,8,9]),{headers:{'Content-Type':'audio/mpeg'}});
let range=await scope.rangedResponse(sample(),'bytes=2-5');
assert.equal(range.status,206);assert.equal(range.headers.get('Content-Range'),'bytes 2-5/10');
assert.deepEqual([...new Uint8Array(await range.arrayBuffer())],[2,3,4,5]);
range=await scope.rangedResponse(sample(),'bytes=-3');assert.deepEqual([...new Uint8Array(await range.arrayBuffer())],[7,8,9]);
range=await scope.rangedResponse(sample(),'bytes=8-');assert.deepEqual([...new Uint8Array(await range.arrayBuffer())],[8,9]);
for(const invalid of ['bytes=10-','bytes=5-2','bytes=-0','bytes=','bytes=0-1,3-4'])assert.equal((await scope.rangedResponse(sample(),invalid)).status,416);

// Upgrading the UI must preserve complete offline audio, while rejecting a
// recording changed at the same URL (even if its byte length is unchanged).
const audioBytes=Uint8Array.from([0,1,2,3,4,5,6,7,8,9]);
const digest=createHash('sha256').update(audioBytes).digest('hex');
const cacheStores=new Map();
const makeCache=()=>{const entries=new Map();return{match:async url=>entries.get(url)?.clone(),put:async(url,response)=>{entries.set(url,response.clone());},addAll:async urls=>{for(const url of urls)entries.set(url,new Response('<html>app</html>'));}};};
scope.caches={keys:async()=>[...cacheStores.keys()],open:async key=>{if(!cacheStores.has(key))cacheStores.set(key,makeCache());return cacheStores.get(key);},delete:async key=>cacheStores.delete(key)};
const old=await scope.caches.open('ouvir-ingles-listening-previous');
await old.put('/audio/kept.mp3',sample());
await old.put('/audio/changed.mp3',new Response(Uint8Array.from([9,1,2,3,4,5,6,7,8,9])));
const manifest={version:'ouvir-ingles-listening-v5',files:[{url:'/index.html',audio:false},{url:'/audio/kept.mp3',audio:true,bytes:10,sha256:digest},{url:'/audio/changed.mp3',audio:true,bytes:10,sha256:digest}]};
scope.fetch=async()=>new Response(JSON.stringify(manifest));
let installation;
listeners.install({waitUntil(promise){installation=promise;}});await installation;
const updated=await scope.caches.open('ouvir-ingles@/:'+manifest.version);
assert(await updated.match('/audio/kept.mp3'),'Valid offline audio must survive an app update');
assert.equal(await updated.match('/audio/changed.mp3'),undefined,'Changed audio must not be copied from an older cache');
let activation;
listeners.activate({waitUntil(promise){activation=promise;}});await activation;
assert.equal(cacheStores.has('ouvir-ingles-listening-previous'),false);
assert(await updated.match('/audio/kept.mp3'),'Deleting old app caches must not delete migrated audio');
console.log('Listening: dictation, scheduling, retention, adaptation, backup, offline byte ranges and audio preservation across updates passed.');
