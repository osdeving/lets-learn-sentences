import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const origin='http://127.0.0.1:4173';
const target=await fetch(`http://127.0.0.1:9222/json/new?${origin}`,{method:'PUT'}).then(r=>r.json());
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let seq=0;const pending=new Map();
socket.onmessage=event=>{const v=JSON.parse(event.data);const p=pending.get(v.id);if(!p)return;pending.delete(v.id);v.error?p.reject(new Error(v.error.message)):p.resolve(v.result);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const v=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(v.exceptionDetails)throw new Error(v.exceptionDetails.exception?.description??v.exceptionDetails.text);return v.result.value;};
const wait=async(expression,timeout=30000)=>{const at=Date.now();while(Date.now()-at<timeout){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw new Error('Timed out '+expression);};
const click=async text=>{const point=await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(text)}));if(!b||b.disabled)return null;b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};})()`);assert(point,text);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});};
await send('Page.enable');await send('Network.enable');await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
await wait("Boolean(document.querySelector('.decoding-coach'))");
await evaluate('(async()=>{for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const key of await caches.keys())await caches.delete(key);localStorage.clear();location.reload();})()');
await wait("Boolean(document.querySelector('.decoding-coach'))");await wait('navigator.serviceWorker.controller !== null');
await click('Preparar modo offline');await wait("document.querySelector('.coach-offline').innerText.includes('Pronto:')",60000);
const cacheReport=await evaluate(`(async()=>{const m=await fetch('/offline-manifest.json').then(r=>r.json());const c=await caches.open(m.version);const missing=[];for(const f of m.files)if(!await c.match(f.url))missing.push(f.url);return{version:m.version,files:m.files.length,audios:m.files.filter(f=>f.audio).length,missing};})()`);
assert.equal(cacheReport.missing.length,0);
console.log('OFFLINE_PREPARED',JSON.stringify(cacheReport));
await writeFile('/tmp/listening-offline-ready.json',JSON.stringify(cacheReport));
// The test driver now stops the preview server. This verifies more than emulation alone.
let stopped=false;
for(let i=0;i<300;i++){
 try{await fetch(origin,{signal:AbortSignal.timeout(500)});}catch{stopped=true;break;}
 await new Promise(r=>setTimeout(r,200));
}
assert(stopped,'Stop the preview server after OFFLINE_PREPARED appears');
await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
await send('Page.reload',{ignoreCache:true});await wait("Boolean(document.querySelector('.decoding-coach'))");
const audioRange=await evaluate(`(async()=>{const r=await fetch('/audio/elllo/081.mp3',{headers:{Range:'bytes=100-159'}});return{status:r.status,bytes:(await r.arrayBuffer()).byteLength,range:r.headers.get('Content-Range')};})()`);
assert.equal(audioRange.status,206);assert.equal(audioRange.bytes,60);
const words=await evaluate(`(async()=>{const d=await fetch('/data/decoding.json').then(r=>r.json());return await Promise.all(d.pairs.flatMap(p=>p.words).map(async w=>{const r=await fetch(w.audioUrl);return{word:w.text,status:r.status,bytes:(await r.arrayBuffer()).byteLength};}));})()`);
assert(words.every(w=>w.status===200&&w.bytes>1000));assert.equal(words.length,14);
await click('Começar próxima lição');await wait("Boolean(document.querySelector('.coach-session'))");
await click('Ouvir em 1×');await wait("document.querySelector('.audio-orb').classList.contains('playing')");await wait("!document.querySelector('.audio-orb').classList.contains('playing')",25000);
assert.equal(await evaluate("Boolean(document.querySelector('.coach-notice[role=alert]'))"),false);
await click('Escrever o que ouvi');await wait("Boolean(document.querySelector('#first-dictation'))");
const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile('/tmp/listening-offline.png',Buffer.from(shot.data,'base64'));
console.log(`Offline passed: server stopped, network disabled, app reloaded, ${cacheReport.audios} audio files cached, 14 contrasts fetched, byte range served and audio played.`);
await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
socket.close();
