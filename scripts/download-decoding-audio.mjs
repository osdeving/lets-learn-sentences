import { readFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
await mkdir('public/audio/elllo',{recursive:true});
const sources=JSON.parse(await readFile('scripts/elllo-downloads.json','utf8'));
for(const source of sources){
  execFileSync('curl',['-L','--fail','--silent','--show-error','--retry','3','--max-time','90',source.url,'-o',`public${source.file}`],{stdio:'inherit'});
  console.log(source.file);
}
execFileSync('python3',['scripts/download-sound-pairs.py'],{stdio:'inherit'});
console.log('Gravações ELLLO e Commons prontas. Créditos individuais preservados.');
