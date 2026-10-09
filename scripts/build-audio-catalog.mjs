import {readFile,writeFile} from 'node:fs/promises';
const read=async name=>JSON.parse(await readFile(`public/data/${name}.json`,'utf8'));
const guide=await read('sentences');
const manifest=await read('elevenlabs-generation');
const contributions=await read('audio-contributions');
const categories=new Map(guide.categories.map(c=>[c.id,c.title]));
const sources=['sentences','extras','idioms','advanced'];
const sentences=[];
for(const name of sources){
 const data=name==='sentences'?guide:await read(name);
 for(const category of data.categories??[])categories.set(category.id,category.title);
 if(data.category)categories.set(data.category.id,data.category.title);
 for(const s of data.sentences){
  const contribution=contributions.find(c=>c.audioUrl===s.audioUrl&&c.sentenceId===s.id);
  const eleven=s.audioUrl?.startsWith('/audio/elevenlabs/')||contribution?.provider==='ElevenLabs';
  const entry=eleven?Object.values(manifest.entries).find(e=>e.audioUrl===s.audioUrl):undefined;
  sentences.push({id:s.id,english:s.english,portuguese:s.portuguese,category:categories.get(s.categoryId)??s.categoryId,dataset:`public/data/${name}.json`,status:eleven?'elevenlabs':contribution?.provider==='human'?'human':s.audioUrl?'recorded':'browser',audioUrl:s.audioUrl??null,voice:contribution?.voice??(entry?manifest.voiceName:null),model:contribution?.model??entry?.model_id??null,contributor:contribution?.contributor??null,priority:!s.audioUrl?'Gerar primeiro':'Revisar apenas se houver um problema'});
 }
}
const recordings=new Map();
async function visitAudio(value,dataset,inheritedSource=null){
 if(!value||typeof value!=='object')return;
 if(Array.isArray(value)){for(const item of value)await visitAudio(item,dataset,inheritedSource);return;}
 const source=value.source??inheritedSource;
 if(typeof value.audioUrl==='string'&&!value.audioUrl.startsWith('/audio/elevenlabs/')){
  const record=recordings.get(value.audioUrl)??{audioUrl:value.audioUrl,status:source?'human':'recorded',sources:[],references:[]};
  if(source&&!record.sources.some(s=>JSON.stringify(s)===JSON.stringify(source)))record.sources.push(source);
  record.references.push({dataset,id:value.id??value.text??'',title:value.title??value.english??value.text??'',start:value.start??value.audioStart??0,end:value.end??value.audioEnd??value.duration??null,aligned:Boolean(value.words?.length||value.lines?.some(l=>l.audioStart!==undefined)||value.segments?.some(s=>s.audioStart!==undefined))});
  recordings.set(value.audioUrl,record);
 }
 for(const [key,item]of Object.entries(value))if(key!=='source')await visitAudio(item,dataset,source);
}
for(const name of ['audio-library','dialogues','stories','decoding','vocabulary/catalog'])await visitAudio(await read(name),`public/data/${name}.json`);
for(const credit of contributions.filter(c=>c.provider==='human'))await visitAudio({id:credit.sentenceId,audioUrl:credit.audioUrl,source:{publisher:credit.contributor,contributor:credit.contributor,license:'Licença informada na contribuição',licenseUrl:credit.licenseUrl,url:credit.issueUrl}},'public/data/audio-contributions.json');
const dialogues=(await read('dialogues')).dialogues,stories=(await read('stories')).stories;
const summary={sentences:sentences.length,elevenlabs:sentences.filter(s=>s.status==='elevenlabs').length,browser:sentences.filter(s=>s.status==='browser').length,otherRecorded:sentences.filter(s=>s.status==='recorded'||s.status==='human').length,humanFiles:[...recordings.values()].filter(r=>r.status==='human').length,dialogues:{total:dialogues.length,human:dialogues.filter(d=>d.audioUrl).length,browser:dialogues.filter(d=>!d.audioUrl).length},stories:{total:stories.length,human:stories.filter(s=>s.audioUrl).length,browser:stories.filter(s=>!s.audioUrl).length}};
const catalog={schemaVersion:1,summary,sentences,recordings:[...recordings.values()].sort((a,b)=>a.audioUrl.localeCompare(b.audioUrl))};
await writeFile('public/data/audio-contribution-catalog.json',JSON.stringify(catalog,null,2)+'\n');
const fields=['id','english','portuguese','category','status','voice','model','audioUrl','dataset','priority'];
const csv=value=>'"'+String(value??'').replaceAll('"','""')+'"';
await writeFile('public/data/audio-contribution-catalog.csv','\uFEFF'+[fields.join(','),...sentences.map(s=>fields.map(k=>csv(s[k])).join(','))].join('\r\n')+'\r\n');
console.log('Audio catalog:',JSON.stringify(summary));
