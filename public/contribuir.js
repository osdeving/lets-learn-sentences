const $=id=>document.getElementById(id);
const label={elevenlabs:'ElevenLabs',browser:'Voz do navegador',human:'Voz humana',recorded:'Gravação local'};
const link=path=>new URL(path.replace(/^\//,''),new URL('./',location.href)).href;
let catalog,filtered=[],page=0,selected=null,localURL=null;
const size=40;
const text=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e;};
const normalized=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function clearPreview(){
 $('current-audio').pause();$('local-audio').pause();if('speechSynthesis'in window)window.speechSynthesis.cancel();
 if(localURL)URL.revokeObjectURL(localURL);localURL=null;
 $('local-audio').removeAttribute('src');$('local-audio').hidden=true;$('local-file').value='';$('preview-status').textContent='';
 $('preview').hidden=true;selected=null;
}
function select(row){
 clearPreview();selected=row;$('preview').hidden=false;$('preview-title').textContent='Comparar · '+row.id;$('selected').textContent=row.english;
 $('current-source').textContent=label[row.status]+(row.voice?' · '+row.voice:'')+(row.contributor?' · contribuição de '+row.contributor:'');
 const current=$('current-audio');current.hidden=!row.audioUrl;
 if(row.audioUrl)current.src=link(row.audioUrl);else current.removeAttribute('src');
 $('propose').href='https://github.com/osdeving/lets-learn-sentences/issues/new?template=audio-existente.yml&title='+encodeURIComponent('[Áudio existente] '+row.id)+'&frases='+encodeURIComponent(row.id+' | '+row.english);
 $('preview').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function render(){
 $('rows').replaceChildren();
 for(const row of filtered.slice(page*size,(page+1)*size)){
  const tr=document.createElement('tr');tr.append(text('td',row.id));
  const phrase=text('td',row.english);phrase.append(text('small',row.portuguese),text('small',row.category));tr.append(phrase);
  const status=text('td',label[row.status]);status.className='status';if(row.voice)status.append(text('small',row.voice));tr.append(status);
  const action=document.createElement('td'),button=text('button','Comparar / enviar');button.addEventListener('click',()=>select(row));action.append(button);tr.append(action);$('rows').append(tr);
 }
 $('count').textContent=filtered.length.toLocaleString('pt-BR')+' sentenças encontradas';
 $('page').textContent=filtered.length?`${page+1} / ${Math.ceil(filtered.length/size)}`:'0 / 0';
 $('previous').disabled=page===0;$('next').disabled=(page+1)*size>=filtered.length;
}
function filter(){if(!catalog)return;page=0;const query=normalized($('search').value);filtered=catalog.sentences.filter(s=>($('status').value==='all'||s.status===$('status').value)&&($('category').value==='all'||s.category===$('category').value)&&normalized([s.id,s.english,s.portuguese].join(' ')).includes(query));render();}
$('search').addEventListener('input',filter);$('status').addEventListener('change',filter);$('category').addEventListener('change',filter);
$('previous').addEventListener('click',()=>{page--;render();});$('next').addEventListener('click',()=>{page++;render();});
$('close-preview').addEventListener('click',clearPreview);
$('play-current').addEventListener('click',async()=>{
 if(!selected)return;$('local-audio').pause();
 if('speechSynthesis'in window)window.speechSynthesis.cancel();
 if(selected.audioUrl){try{await $('current-audio').play();}catch{$('preview-status').textContent='Não foi possível tocar o arquivo atual. Tente novamente.';}}
 else if('speechSynthesis'in window){const u=new SpeechSynthesisUtterance(selected.english);u.lang='en-US';u.rate=1;u.voice=window.speechSynthesis.getVoices().find(v=>v.lang==='en-US')??null;window.speechSynthesis.speak(u);}
 else $('preview-status').textContent='Este navegador não oferece síntese de voz.';
});
$('copy-text').addEventListener('click',async()=>{if(!selected)return;try{await navigator.clipboard.writeText(selected.english);$('preview-status').textContent='Inglês copiado. Cole somente esse texto no ElevenLabs.';}catch{$('preview-status').textContent='Selecione e copie o texto em inglês acima.';}});
$('local-file').addEventListener('change',()=>{
 $('local-audio').pause();if(localURL)URL.revokeObjectURL(localURL);localURL=null;$('local-audio').hidden=true;$('local-audio').removeAttribute('src');
 const file=$('local-file').files[0];if(!file)return;
 if(!/\.(mp3|wav)$/i.test(file.name)||file.size>25*1024*1024){$('preview-status').textContent='Escolha MP3 ou WAV de até 25 MB.';return;}
 localURL=URL.createObjectURL(file);$('local-audio').src=localURL;$('local-audio').hidden=false;$('preview-status').textContent='Prévia local: '+file.name+'. Nenhum arquivo foi enviado.';
});
$('local-audio').addEventListener('play',()=>{$('current-audio').pause();if('speechSynthesis'in window)window.speechSynthesis.cancel();});
$('local-audio').addEventListener('error',()=>{$('preview-status').textContent='Não foi possível decodificar o arquivo escolhido.';});
window.addEventListener('pagehide',clearPreview);
try{
 const response=await fetch('data/audio-contribution-catalog.json',{cache:'no-cache'});if(!response.ok)throw Error('HTTP '+response.status);catalog=await response.json();
 $('stats').replaceChildren();for(const [count,title]of [[catalog.summary.elevenlabs,'Sentenças ElevenLabs'],[catalog.summary.browser,'Sentenças com voz do navegador'],[catalog.summary.humanFiles,'Arquivos de voz humana']]){const p=document.createElement('p');p.append(text('strong',count.toLocaleString('pt-BR')),text('span',title));$('stats').append(p);}
 for(const name of [...new Set(catalog.sentences.map(s=>s.category))].sort()){const o=text('option',name);o.value=name;$('category').append(o);}
 const summary=catalog.summary;$('resource-counts').textContent=`Biblioteca: ${summary.library.human} clipes humanos e ${summary.library.other} gravações de outro tipo ou com tipo de voz não verificado. Diálogos: ${summary.dialogues.human} com gravação humana e ${summary.dialogues.browser} com voz do navegador. Histórias: ${summary.stories.human} com gravação humana e ${summary.stories.browser} com voz do navegador. A trilha usa 70 microclipes e 14 gravações para contrastes de sons.`;
 for(const recording of catalog.recordings){const article=document.createElement('article');article.append(text('h3',recording.references[0]?.title||recording.audioUrl));article.append(text('p',recording.status==='human'?'Voz humana gravada':'Gravação · tipo de voz não verificado ou sintetizado'));article.append(text('p',recording.audioUrl));
  for(const source of recording.sources){const p=text('p',[source.publisher,source.contributor,source.license].filter(Boolean).join(' · '));p.className='human-meta';for(const [url,title]of [[source.url,'Fonte'],[source.licenseUrl,'Licença']])if(url&&/^https:\/\//.test(url)){const a=text('a',title);a.href=url;a.target='_blank';a.rel='noreferrer';p.append(document.createTextNode(' · '),a);}article.append(p);}
  const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=link(recording.audioUrl);article.append(audio);
  const refs=document.createElement('details');refs.append(text('summary',recording.references.length+' referências no conteúdo'));for(const ref of recording.references)refs.append(text('p',[ref.dataset,ref.id,ref.aligned?'possui alinhamento':'',ref.start!=null?'início '+ref.start+' s':'',ref.end!=null?'fim '+ref.end+' s':''].filter(Boolean).join(' · ')));article.append(refs);$('human-files').append(article);
 }
 filter();
}catch(error){$('stats').textContent='Catálogo indisponível';$('error').textContent='Não foi possível carregar o catálogo. Recarregue a página ou use o guia no GitHub.';}
