import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN??'http://127.0.0.1:5173';
const target=await fetch(`http://127.0.0.1:9222/json/new?${origin}`,{method:'PUT'}).then(r=>r.json());
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let sequence=0;const pending=new Map();
socket.onmessage=event=>{const v=JSON.parse(event.data);if(!v.id)return;const p=pending.get(v.id);if(!p)return;pending.delete(v.id);v.error?p.reject(new Error(v.error.message)):p.resolve(v.result);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const v=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(v.exceptionDetails)throw new Error(v.exceptionDetails.exception?.description??v.exceptionDetails.text);return v.result.value;};
const wait=async(expression,timeout=20000)=>{const at=Date.now();while(Date.now()-at<timeout){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw new Error('Timed out: '+expression);};
const click=async text=>{const point=await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(text)}));if(!b||b.disabled)return null;b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};})()`);assert(point,text);await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});};
try{
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await wait("Boolean(document.querySelector('.decoding-coach'))");
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`
  window.__audioCalls=[];window.__audioElements=0;window.__rejectFirst=false;
  const NativeAudio=window.Audio;const src=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'src');
  window.Audio=function(...args){window.__audioElements++;const audio=new NativeAudio(...args);Object.defineProperty(audio,'src',{get(){return src.get.call(audio);},set(url){src.set.call(audio,window.__breakSource?url+'?playback-test=unavailable':url);}});return audio;};
  const nativePlay=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){window.__audioCalls.push({readyState:this.readyState,active:navigator.userActivation.isActive});if(window.__rejectFirst){window.__rejectFirst=false;return Promise.reject(new DOMException('User gesture required','NotAllowedError'));}return nativePlay.call(this);};
 `});
 await evaluate("localStorage.removeItem('ouvir-ingles:v4:decoding-progress');localStorage.removeItem('ouvir-ingles:v4:decoding-settings');location.reload()");
 await wait("Boolean(document.querySelector('.decoding-coach'))");
 await click('Começar próxima lição');await click('Ouvir em 1×');
 await wait("document.querySelector('.audio-orb').classList.contains('playing')");
 const call=await evaluate('window.__audioCalls[0]');
 assert.equal(call.active,true,'Playback must start within the real click gesture');
 assert.equal(call.readyState,0,'Playback must be requested before waiting for metadata');
 await click('Parar');await click('Ouvir em 1×');
 await wait("document.querySelector('.audio-orb').classList.contains('playing')");
 assert.equal(await evaluate('window.__audioElements'),1,'Repeated playback must reuse the unlocked element');
 await click('Parar');
 // DOMException must produce an actionable message, then retry the same real file.
 await evaluate('window.__rejectFirst=true');await click('Ouvir em 1×');
 await wait("document.querySelector('.coach-notice[role=alert]')?.textContent.includes('navegador bloqueou')");
 assert(await evaluate("document.querySelector('.coach-notice').textContent.includes('NotAllowedError')"));
 await click('Tentar tocar novamente');
 await wait("document.querySelector('.audio-orb').classList.contains('playing')");
 assert.equal(await evaluate("Boolean(document.querySelector('.coach-notice[role=alert]'))"),false);
 await click('Parar');await click('Sair da sessão');
 // Simulate an unavailable server/file, then restore it and verify recovery.
 await evaluate('window.__breakSource=true');
 await send('Network.setBlockedURLs',{urls:['*playback-test=unavailable*']});
 await click('Começar próxima lição');await click('Ouvir em 1×');
 await wait("document.querySelector('.coach-notice[role=alert]')?.textContent.includes('servidor local')");
 assert(await evaluate("document.querySelector('.coach-notice').textContent.includes('/audio/elllo/081.mp3')"));
 await send('Network.setBlockedURLs',{urls:[]});await evaluate('window.__breakSource=false');await click('Tentar tocar novamente');
 await wait("document.querySelector('.audio-orb').classList.contains('playing')");
 await wait("!document.querySelector('.audio-orb').classList.contains('playing')",25000);
 assert.equal(await evaluate("document.querySelector('.coach-blind-player small').textContent"),'2 reproduções completas');
 assert.equal(await evaluate("Boolean(document.querySelector('.coach-notice[role=alert]'))"),false);
 console.log('Playback: immediate user gesture, element reuse, browser denial, missing server/file and successful retry passed with real audio.');
}finally{await send('Network.setBlockedURLs',{urls:[]});await send('Page.close').catch(()=>{});socket.close();}
