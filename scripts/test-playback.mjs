import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

function hooks() {
  const slots = []; let cursor = 0; let effects = [];
  const same = (a,b) => a && b && a.length === b.length && a.every((v,i) => Object.is(v,b[i]));
  return { slots, begin(){cursor=0;effects=[];}, flush(){for(const f of effects) f();},
    react: {
      useRef(value){const i=cursor++;return slots[i] ??= {current:value};},
      useState(value){const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},
      useCallback(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={fn,deps};return slots[i].fn;},
      useEffect(fn,deps){const i=cursor++;if(!same(slots[i]?.deps,deps)){effects.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()};});}},
    },
  };
}
function clock(){let id=0,now=0;const jobs=new Map();return{setTimeout(fn,delay){jobs.set(++id,{fn,at:now+delay});return id;},clearTimeout(i){jobs.delete(i);},advance(ms){const end=now+ms;while(true){const next=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;jobs.delete(next[0]);next[1].fn();}now=end;},get now(){return now;},get size(){return jobs.size;}};}
async function load(file, dependencies, globals){const source=ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const scope={exports:{},require:name=>{assert(name in dependencies,name);return dependencies[name];},...globals};vm.runInNewContext(source,scope);return scope.exports;}
const h=hooks(), time=clock();let frame;let audio;let attempts=0;let pending;let alwaysAbort=false;
class FakeAudio {
  constructor(){audio=this;this.isConnected=false;this.readyState=0;this.duration=10;this.currentTime=0;this.src='';}
  setAttribute(){} pause(){} load(){} removeAttribute(){} remove(){this.isConnected=false;}
  play(){attempts++;assert(this.isConnected,'Audio must be attached before the first play request');if(pending)return new Promise((resolve,reject)=>{pending={resolve,reject};});if(attempts===1||alwaysAbort)return Promise.reject(new DOMException('media removed from document','AbortError'));this.readyState=1;this.onloadedmetadata?.();return Promise.resolve();}
}
const playerModule=await load('src/hooks/useClipPlayer.ts',{react:h.react},{Audio:FakeAudio,DOMException,URL,document:{baseURI:'https://example.test/app/',body:{appendChild(a){a.isConnected=true;}}},window:time,requestAnimationFrame:fn=>{frame=fn;return 1;},cancelAnimationFrame:()=>{frame=undefined;}});
h.begin();const player=playerModule.useClipPlayer();h.flush();let completed=0;
await player.play('/audio.mp3',2,5,{onComplete:()=>completed++});assert.equal(attempts,2,'AbortError must recover without a second click');assert.equal(audio.currentTime,2);audio.currentTime=5;frame();assert.equal(completed,1);
// An intentional stop while play is pending must never resume playback.
pending=true;const waiting=player.play('/audio.mp3',2,5);player.stop();pending.reject(new DOMException('paused','AbortError'));await waiting;assert.equal(attempts,3);pending=undefined;
alwaysAbort=true;await player.play('/audio.mp3',2,5);assert.equal(attempts,5,'Repeated failure must stop after one recovery attempt');assert(h.slots.some(v=>typeof v==='string'&&v.includes('carregar este áudio')));alwaysAbort=false;

const qh=hooks(), qt=clock(), calls=[], selections=[], heard=[];const stored=new Map();let queuePlayerError='';
const native={stop(){},get error(){return queuePlayerError;},position:0,play(url,start,end,options){calls.push({url,start,end,options,at:qt.now});return Promise.resolve();}};
const queueModule=await load('src/hooks/useListeningQueue.ts',{react:qh.react,'./useClipPlayer':{useClipPlayer:()=>native}},{window:qt,localStorage:{getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v)}});
const items=[{id:'a',text:'A',audioUrl:'/a.mp3'},{id:'b',text:'B',audioUrl:'/b.mp3'}];
function render(list=items){qh.begin();const q=queueModule.useListeningQueue(list,'settings',undefined,i=>selections.push(i),id=>heard.push(id));qh.flush();return q;}
let queue=render();assert.equal(queue.settings.repeats,3);assert.equal(queue.settings.gap,500);queue.start();
for(let i=0;i<6;i++){assert.equal(calls.length,i+1);calls[i].options.onComplete();if(i<5){qt.advance(499);assert.equal(calls.length,i+1,'Must honor the pause');qt.advance(1);}}
assert.deepEqual(calls.map(c=>c.url),['/a.mp3','/a.mp3','/a.mp3','/b.mp3','/b.mp3','/b.mp3']);assert.deepEqual(selections,[0,1]);assert.deepEqual(heard,['a','b']);assert.equal(qt.size,0,'Stop at the end by default');
queue.start();calls.at(-1).options.onComplete();queue.stop();const stopped=calls.length;qt.advance(2000);assert.equal(calls.length,stopped,'Pause must cancel scheduled audio');
queue.configure({...queue.settings,repeats:2,gap:700});queue=render();assert.equal(queue.settings.gap,700);assert.equal(JSON.parse(stored.get('settings')).repeats,2);
queue.start();calls.at(-1).options.onComplete();render([{id:'c',text:'C',audioUrl:'/c.mp3'}]);qt.advance(1000);assert.equal(calls.length,stopped+1,'Changing filters must cancel the previous queue');
queuePlayerError='unavailable';queue=render();assert(qh.slots.includes('unavailable'),'Media failures must stop and remain visible');
// Sentences without MP3 must advance on actual utterance completion, not a guessed duration.
const sh=hooks(), st=clock(), spoken=[];
class Utterance { constructor(text){this.text=text;} }
let cancels=0;
st.speechSynthesis={speak:u=>spoken.push(u),cancel(){cancels++;}};
const speechModule=await load('src/hooks/useListeningQueue.ts',{react:sh.react,'./useClipPlayer':{useClipPlayer:()=>({stop:native.stop,error:'',position:0,play:native.play})}},{window:st,SpeechSynthesisUtterance:Utterance,localStorage:{getItem:()=>null,setItem(){}}});
sh.begin();const sq=speechModule.useListeningQueue([{id:'s1',text:'Hello.'},{id:'s2',text:'Goodbye.'}],'speech');sh.flush();sq.start();
assert.equal(spoken[0].text,'Hello.');st.advance(5000);assert.equal(spoken.length,1,'Speech must finish before advancing');
for(let i=0;i<3;i++){spoken.at(-1).onend();st.advance(500);}
assert.equal(spoken.length,4);assert.equal(spoken.at(-1).text,'Goodbye.');sq.stop();assert.equal(spoken.at(-1).onend,null);assert(cancels>0);
// Repeating the selection is explicit and a stop cancels the wraparound.
queuePlayerError='';queue=render();queue.configure({...queue.settings,repeats:1,gap:500,loop:true});queue=render();queue.start(1);calls.at(-1).options.onComplete();qt.advance(500);assert.equal(calls.at(-1).url,'/a.mp3');queue.stop();
console.log('Playback passed: attached media, first-click AbortError recovery, deliberate stop, 3 repeats, 500 ms gaps, automatic advance, end of list, pause, changed filters and saved settings.');

// Official SoundCloud embeds must repeat on FINISH, honor gaps, and cancel pending loads.
const wh=hooks(), wt=clock(), events={}, wp=[];let loadedUrl='one';let deferredLoad;
const mockWidget={bind(e,fn){events[e]=fn;},unbind(e){delete events[e];},pause(){},seekTo(){},play(){wp.push(loadedUrl);},load(url,options){loadedUrl=url;if(deferredLoad)deferredLoad=options.callback;else options.callback();}};
const factory=()=>mockWidget;factory.Events={READY:'ready',FINISH:'finish',ERROR:'error'};
const wm=await load('src/hooks/useSoundCloudQueue.ts',{react:wh.react},{window:{...wt,SC:{Widget:factory}},localStorage:{getItem:()=>null,setItem(){}},document:{createElement:()=>({}),head:{appendChild(script){script.onload();}}}});
const wu=['one','two'];
function wr(urls=wu){wh.begin();const q=wm.useSoundCloudQueue(urls);q.iframe.current={};wh.flush();return q;}
let wq=wr();await Promise.resolve();events.ready();wq=wr();assert(wq.ready);wq.start();
for(let i=0;i<6;i++){assert.equal(wp.length,i+1);events.finish();if(i<5){wt.advance(499);assert.equal(wp.length,i+1);wt.advance(1);}}
assert.deepEqual(wp,['one','one','one','two','two','two']);assert.equal(wr().running,false);
wq=wr();wq.choose(0);wq=wr();wq.start();events.finish();wq.stop();wt.advance(1000);assert.equal(wp.length,7);
wq=wr();wq.configure({...wq.settings,repeats:1});wq=wr();wq.start();deferredLoad=true;events.finish();wt.advance(500);assert.equal(typeof deferredLoad,'function');wq.stop();deferredLoad();assert.equal(wp.length,8,'Late load callback must not restart after pause');
console.log('SoundCloud passed: official widget completion, repeats, gaps, advance, end of list and cancellation of pending loads.');

mockWidget.pause=()=>{throw new TypeError("Removed iframe cannot receive postMessage");};
assert.doesNotThrow(()=>wr([]), 'Changing to an external source must survive removal of the player iframe');

// Manual vocabulary audio starts in the click gesture without a state/effect round trip.
queue=render([]);const beforeImmediate=calls.length;queue.start(0,true,[{id:'manual',text:'mug',audioUrl:'/mug.mp3',rate:0.7}]);
assert.equal(calls.length,beforeImmediate+1);assert.equal(calls.at(-1).url,'/mug.mp3');assert.equal(calls.at(-1).options.rate,0.7);calls.at(-1).options.onComplete();qt.advance(2000);assert.equal(calls.length,beforeImmediate+1,'Manual play must neither repeat nor advance');
