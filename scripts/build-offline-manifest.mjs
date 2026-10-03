import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
async function walk(dir) {
  const entries=await readdir(dir,{withFileTypes:true});
  const lists=await Promise.all(entries.map(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]));
  return lists.flat();
}
const paths=(await walk('dist')).filter(file=>!['sw.js','offline-manifest.json'].includes(path.basename(file))).sort();
const hash=createHash('sha256');
hash.update(await readFile('public/sw.js'));
const base=(process.env.VITE_BASE_PATH || '/').replace(/\/?$/, '/');
const files=[];
for(const file of paths){const bytes=await readFile(file);hash.update(file);hash.update(bytes);files.push({url:base+path.relative('dist',file).split(path.sep).join('/'),bytes:bytes.byteLength,sha256:createHash('sha256').update(bytes).digest('hex'),audio:/\.(mp3|ogg|wav)$/i.test(file)});}
const version='ouvir-ingles-listening-'+hash.digest('hex').slice(0,12);
await writeFile('dist/offline-manifest.json',JSON.stringify({version,cacheName:`ouvir-ingles@${base}:${version}`,files},null,2)+'\n');
const worker=await readFile('public/sw.js','utf8');
await writeFile('dist/sw.js',worker.replace('"ouvir-ingles-listening-v5"',JSON.stringify(version)));
console.log(`Offline: ${files.length} arquivos, ${(files.reduce((n,f)=>n+f.bytes,0)/1048576).toFixed(1)} MB, ${version}`);
