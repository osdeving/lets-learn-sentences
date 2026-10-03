import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { DecodingData, DecodingLesson } from "../types";
import { adaptiveClips, DAILY_BLOCKS, DAY, dueClips, ERROR_LABELS, errorProfile, localDay, readCoachProgress, saveCoachProgress, scheduleReview, validateProgress } from "../lib/decoding";
import type { ListeningAttempt } from "../lib/decoding";
import { STORAGE } from "../lib/storage";
import { DecodingSession } from "./DecodingSession";
import type { CoachSettings, SessionPlan } from "./DecodingSession";
import { SoundContrast } from "./SoundContrast";
import { OfflinePanel } from "./OfflinePanel";
import { useClipPlayer } from "../hooks/useClipPlayer";

const defaultSettings: CoachSettings={autoAdvance:true,repeats:5,gap:600,minutes:75,speaker:"all"};
function readSettings():CoachSettings{
  try{
    const v=JSON.parse(localStorage.getItem(STORAGE.decodingSettings)??"{}");
    return {autoAdvance:typeof v.autoAdvance==='boolean'?v.autoAdvance:true,repeats:[5,10].includes(v.repeats)?v.repeats:5,gap:[400,600,1000].includes(v.gap)?v.gap:600,minutes:[20,45,75,90].includes(v.minutes)?v.minutes:75,speaker:typeof v.speaker==='string'?v.speaker:'all'};
  }catch{return defaultSettings;}
}
const WEEK_TITLES=["Separar o fluxo","Reduções em chunks","Formas fracas","Ligações e contrações","Vogais em contexto","Finais e grupos de sons","Acesso rápido","Transferência e autonomia"];
export function DecodingCoach({data}:{data:DecodingData}){
  const [progress,setProgress]=useState(readCoachProgress);
  const [settings,setSettings]=useState(readSettings);
  const [week,setWeek]=useState(()=>Math.min(8,Math.floor(readCoachProgress().completedLessons.length/3)+1));
  const [plan,setPlan]=useState<SessionPlan|null>(null);
  const [showContrast,setShowContrast]=useState(false);
  const [freeListening,setFreeListening]=useState(false);
  const [notice,setNotice]=useState("");
  const [importPending,setImportPending]=useState<ReturnType<typeof validateProgress>|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const player=useClipPlayer();
  const profile=useMemo(()=>errorProfile(progress),[progress]);
  const dueAll=dueClips(data.clips,progress);
  const due=dueAll.filter(c=>settings.speaker==='all'||c.speaker===settings.speaker);
  const trainingIds=new Set(data.lessons.flatMap(l=>l.clipIds));
  const yesterday=data.clips.filter(c=>{const m=progress.memories[c.id];return m&&localDay(m.lastStudied)===localDay(Date.now()-DAY);});
  const speakers=[...new Set(data.clips.map(c=>c.speaker))];
  const lessonClips=(lesson:DecodingLesson)=>lesson.clipIds.map(id=>data.clips.find(c=>c.id===id)!).filter(c=>c&&(settings.speaker==='all'||c.speaker===settings.speaker));
  const limit=Math.max(3,Math.floor(settings.minutes/4));
  const coverage=useMemo(()=>{const map=new Map<string,Set<string>>();for(const a of progress.attempts){if(a.mode!=="lesson")continue;if(!map.has(a.lessonId))map.set(a.lessonId,new Set());map.get(a.lessonId)!.add(a.clipId);}return map;},[progress.attempts]);
  const nextLesson=data.lessons.find(l=>!progress.completedLessons.includes(l.id)&&lessonClips(l).some(c=>!coverage.get(l.id)?.has(c.id)));
  const delayed=Object.values(progress.memories).filter(m=>m.delayedScore!==undefined);
  const retention=delayed.length?Math.round(delayed.reduce((n,m)=>n+(m.delayedScore??0),0)/delayed.length):null;
  const todayAttempts=progress.attempts.filter(a=>localDay(a.at)===localDay()).length;
  const changeSettings=(next:CoachSettings)=>{setSettings(next);localStorage.setItem(STORAGE.decodingSettings,JSON.stringify(next));};
  const start=(session:SessionPlan)=>{if(!session.clips.length){setNotice("Nenhum trecho disponível para essa combinação. Escolha outro falante ou outra lição.");return;} player.stop();setFreeListening(false);setNotice("");setPlan(session);};
  const startLesson=(lesson:DecodingLesson)=>start({clips:lessonClips(lesson),lesson,mode:"lesson",title:`Semana ${lesson.week} · ${lesson.title}`});
  const startReview=()=>start({clips:due.filter(c=>settings.speaker==='all'||c.speaker===settings.speaker).slice(0,limit),mode:"review",title:"Revisão surpresa · sem texto"});
  const recordAttempt=(attempt:ListeningAttempt,effort:"again"|"hard"|"easy")=>{
    setProgress(previous=>{
      const next={...previous,memories:{...previous.memories,[attempt.clipId]:scheduleReview(previous.memories[attempt.clipId],attempt.blindScore,effort,attempt.at,attempt.mode==='review')},attempts:[...previous.attempts,attempt],studyDays:[...new Set([...previous.studyDays,localDay(attempt.at)])]};
      if(attempt.mode==="lesson"){const lesson=data.lessons.find(l=>l.id===attempt.lessonId);const practiced=new Set(next.attempts.filter(a=>a.mode==="lesson"&&a.lessonId===attempt.lessonId).map(a=>a.clipId));if(lesson?.clipIds.every(id=>practiced.has(id)))next.completedLessons=[...new Set([...previous.completedLessons,lesson.id])];}
      saveCoachProgress(next);return next;
    });
  };
  const finishLesson=()=>{
    if(!plan?.lesson || plan.mode!=='lesson')return;
    const lessonId=plan.lesson.id;
    // A narrow-speaker subset is practice, not completion of the entire lesson.
    const practiced=new Set([...(coverage.get(lessonId)??[]),...plan.clips.map(c=>c.id)]);
    if(!plan.lesson.clipIds.every(id=>practiced.has(id))){setNotice("Prática com esse falante concluída. Estude os outros trechos para completar a lição.");return;}
    setProgress(previous=>{const next={...previous,completedLessons:[...new Set([...previous.completedLessons,lessonId])]};saveCoachProgress(next);return next;});
  };
  const exportProgress=()=>{
    const blob=new Blob([JSON.stringify(progress,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`ouvir-ingles-listening-${localDay()}.json`;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const importProgress=async(event:ChangeEvent<HTMLInputElement>)=>{
    try{const file=event.target.files?.[0];if(!file)return;if(file.size>5*1024*1024)throw new Error("Backup muito grande.");const v=validateProgress(JSON.parse(await file.text()));setImportPending(v);setNotice("");}
    catch(reason){setNotice(reason instanceof Error?reason.message:"Backup inválido.");}finally{event.target.value='';}
  };
  const transfer=(lesson:DecodingLesson)=>{
    const clips=lesson.transferIds.map(id=>data.clips.find(c=>c.id===id)!).filter(c=>c&&!progress.memories[c.id]);
    start({clips,lesson,mode:'transfer',title:'Transferência · novos trechos, sem pistas'});
  };
  const freeSources=data.clips.filter(c=>c.kind==='conversation').filter(c=>settings.speaker==='all'||c.speaker===settings.speaker).filter((c,i,all)=>all.findIndex(x=>x.audioUrl===c.audioUrl)===i);
  if(plan)return <DecodingSession key={`${plan.mode}-${plan.lesson?.id??plan.clips[0].id}`} plan={plan} settings={settings} onAttempt={recordAttempt} onFinish={finishLesson} onLeave={()=>{setPlan(null);}} />;
  return <div className="decoding-coach">
    <section className="coach-hero"><div><p className="eyebrow">8 semanas · treinar a decodificação</p><h2>As palavras você conhece.<br/><em>Agora, reconheça o som.</em></h2><p>Transforme poucos segundos de fala real em uma lição completa: ditado, comparação, microloop, imitação e escuta sem texto.</p><div className="coach-button-row"><button className="listen-button" disabled={!nextLesson} onClick={()=>nextLesson&&startLesson(nextLesson)} type="button">{nextLesson?"▶ Começar próxima lição":(progress.completedLessons.length===24?"Todas as lições praticadas":"Nenhuma lição para este falante")}</button><button className="record-button" disabled={!due.length} onClick={startReview} type="button">Revisão surpresa · {due.length}</button></div><p className="coach-small">Se o texto parece óbvio e o áudio não, investigue onde as palavras se juntam. Comece em 1×.</p></div><div className="coach-cycle" aria-label="O método"><span>01 · Ouvir sem texto</span><span>02 · Escrever sua hipótese</span><span>03 · Revelar e comparar</span><span>04 · Repetir o trecho difícil</span><span>05 · Imitar o ritmo</span><span>06 · Ouvir sem olhar</span></div></section>
    <div className="coach-metrics"><div><strong>{progress.completedLessons.length}<small>/24</small></strong><span>lições completas</span></div><div><strong>{todayAttempts}</strong><span>trechos hoje</span></div><div><strong>{due.length}</strong><span>revisões vencidas</span></div><div><strong>{retention===null?'—':`${retention}%`}</strong><span>retenção em outro dia · {delayed.length} trechos</span></div></div>
    <section className="coach-daily"><div className="coach-section-head"><div><p className="section-kicker">Rotina diária · sem pressa</p><h3>Seu treino de hoje</h3></div><label>Duração sugerida<select value={settings.minutes} onChange={e=>changeSettings({...settings,minutes:Number(e.target.value)})}>{[20,45,75,90].map(n=><option key={n} value={n}>{n} minutos</option>)}</select></label></div><p className="coach-small">Ajuste a duração à sua atenção. Os cinco blocos de treino dividem até 75 min; em 90 min, reserve 15 min extras para listening prazeroso. {yesterday.length} trechos estudados ontem. {progress.studyDays.length} dias de prática.</p><div className="coach-daily-blocks">{DAILY_BLOCKS.filter(b=>settings.minutes===90||b.action!=='free').map((block,i)=><div key={block.title}><span>{String(i+1).padStart(2,'0')} · {block.action==='free'?15:settings.minutes/5} min</span><strong>{block.title}</strong><p>{block.description}</p></div>)}</div><details className="coach-method-details"><summary>Preparar o ambiente e entender a rotina</summary><p>Escolha um volume confortável e um lugar tranquilo. Respire, solte os ombros e trate o erro como uma pista. Música ambiente é opcional durante a preparação; na escuta, deixe a voz em destaque.</p><p>Use o ritmo sugerido como uma agenda, não como obrigação: uma frase pode render vários minutos. Alterne lições novas e revisões durante os blocos. A trilha tem três lições por semana; use os demais dias para repetir, revisar e ouvir por prazer.</p><p>Comece na velocidade real. O diagnóstico em 0,9× aparece depois de revelar o texto. Volte a 1× para o teste. Não há promessa de fluência em oito semanas: o resultado depende da sua prática e será acompanhado por revisões sem pistas.</p></details></section>
    <div className="coach-main-grid"><section className="coach-curriculum"><div className="coach-section-head"><div><p className="section-kicker">Trilha de listening</p><h3>{WEEK_TITLES[week-1]}</h3></div><span>Semana {week} de 8</span></div><div className="coach-weeks" aria-label="Semanas">{WEEK_TITLES.map((title,i)=><button type="button" key={title} className={week===i+1?'active':''} title={title} aria-pressed={week===i+1} onClick={()=>setWeek(i+1)}>{i+1}</button>)}</div><div className="coach-lessons">{data.lessons.filter(l=>l.week===week).map(lesson=><article key={lesson.id} className={progress.completedLessons.includes(lesson.id)?'complete':''}><div className="coach-lesson-top"><span>{lesson.id} · {progress.completedLessons.includes(lesson.id)?'✓ Praticada':`${lessonClips(lesson).length} trechos`}</span><small>{lesson.focus.map(f=>ERROR_LABELS[f]).join(' · ')}</small></div><h4>{lesson.title}</h4><p>{lesson.objective}</p><details><summary>O que observar nesta lição</summary><p>{lesson.explanation}</p><p>{lesson.task}</p></details><div className="coach-button-row"><button className="listen-button" disabled={!lessonClips(lesson).length} onClick={()=>startLesson(lesson)} type="button">{progress.completedLessons.includes(lesson.id)?'Praticar novamente':'Abrir lição'} →</button><button className="record-button" disabled={!lesson.transferIds.some(id=>!progress.memories[id])} onClick={()=>transfer(lesson)} type="button">Teste em trecho novo</button>{lesson.pairIds.length>0&&<button className="record-button" onClick={()=>setShowContrast(true)} type="button">Contraste de sons</button>}</div></article>)}</div></section>
      <aside className="coach-sidebar"><section className="coach-settings"><p className="section-kicker">Repetição e narrow listening</p><h3>Menos cliques, mais escuta.</h3><label>Uma voz por vez<select value={settings.speaker} onChange={e=>changeSettings({...settings,speaker:e.target.value})}><option value="all">Trilha completa · todas as vozes</option>{speakers.map(s=><option key={s}>{s}</option>)}</select></label><p className="coach-small">Fique com a mesma voz durante uma semana. Depois volte à trilha completa e experimente outra pessoa. O filtro vale para novas lições, revisões e reforço.</p><label>Repetições do microloop<select value={settings.repeats} onChange={e=>changeSettings({...settings,repeats:Number(e.target.value)})}><option value={5}>5 vezes</option><option value={10}>10 vezes</option></select></label><label>Pausa entre repetições<select value={settings.gap} onChange={e=>changeSettings({...settings,gap:Number(e.target.value)})}><option value={400}>0,4 segundo</option><option value={600}>0,6 segundo</option><option value={1000}>1 segundo</option></select></label><label className="aid-toggle"><input type="checkbox" checked={settings.autoAdvance} onChange={e=>changeSettings({...settings,autoAdvance:e.target.checked})}/><span><strong>Próximo trecho automático</strong><small>Após salvar seu teste, a fila continua com áudio.</small></span></label></section>
      <section className="coach-profile"><p className="section-kicker">Seu mapa de dificuldades</p><h3>O que seu ouvido perde?</h3>{!progress.attempts.some(a=>a.errors.length)?<p>Após comparar o ditado, marque o tipo de dificuldade. Os padrões aparecerão aqui.</p>:<div>{profile.filter(p=>p.count).map(p=><div className="coach-error-bar" key={p.key}><div><span>{ERROR_LABELS[p.key]}</span><strong>{p.percent}%</strong></div><meter min={0} max={100} value={p.percent}/><small>{p.count} registros</small></div>)}</div>}<p className="coach-small">Distribuição dos erros que você marcou. Um trecho pode ter vários tipos; o app não infere causas só pela digitação.</p><button className="record-button" onClick={()=>start({clips:adaptiveClips(data.clips.filter(c=>trainingIds.has(c.id)||progress.memories[c.id]),progress,settings.speaker).slice(0,limit),mode:'adaptive',title:'Reforço baseado nos seus erros'})} type="button">Treinar minhas dificuldades →</button></section></aside>
    </div>
    <section className="coach-labs"><div><h3>Reconhecer sons parecidos</h3><p>14 gravações humanas para comparar vogais, TH e consoantes finais.</p></div><button className="record-button" onClick={()=>setShowContrast(v=>!v)} type="button">{showContrast?'Fechar contraste':'Abrir laboratório de sons'}</button></section>
    {showContrast&&<SoundContrast pairs={data.pairs} onResult={(id,correct)=>{
      setProgress(previous=>{const at=Date.now();const next={...previous,attempts:[...previous.attempts,{id:crypto.randomUUID(),clipId:id,lessonId:'',at,mode:'contrast' as const,initialScore:correct?100:0,blindScore:correct?100:0,errors:correct?[]:['phoneme' as const],slowUsed:false,listens:1}],studyDays:[...new Set([...previous.studyDays,localDay(at)])]};saveCoachProgress(next);return next;});
    }}/>}<section className="coach-labs"><div><h3>Listening por prazer</h3><p>Volte ao contexto e à mesma voz. Ouça uma conversa inteira, sem ditado.</p></div><button className="record-button" disabled={!freeSources.length} onClick={()=>{player.stop();setFreeListening(v=>!v);}} type="button">{freeListening?'Fechar conversas':'Abrir conversas completas'}</button></section>
    {freeListening&&<section className="coach-free-listening">{freeSources.map(c=><article key={c.audioUrl}><h4>{c.source.title}</h4><p>{c.source.contributor}</p><audio controls preload="none" src={c.audioUrl}/><p className="coach-credit"><a href={c.source.url} target="_blank" rel="noreferrer">{c.source.publisher}</a> · <a href={c.source.licenseUrl} target="_blank" rel="noreferrer">{c.source.license}</a></p></article>)}</section>}
    <OfflinePanel/>
    <section className="coach-backup"><div><h3>Seu progresso é local.</h3><p>Exporte um backup para guardar revisões, erros e lições praticadas.</p></div><div className="coach-button-row"><button className="record-button" onClick={exportProgress} type="button">Exportar progresso</button><button className="record-button" onClick={()=>fileRef.current?.click()} type="button">Importar backup</button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e=>void importProgress(e)}/></div>{importPending&&<div className="coach-import-review"><p>Backup válido: {importPending.completedLessons.length} lições, {importPending.attempts.length} tentativas. Substituir o progresso de listening deste navegador?</p><button className="listen-button" onClick={()=>{saveCoachProgress(importPending);setProgress(importPending);setImportPending(null);setNotice('Backup restaurado.');}} type="button">Restaurar este backup</button><button className="record-button" onClick={()=>setImportPending(null)} type="button">Cancelar</button></div>}</section>
    {notice&&<p className="coach-notice" role="status">{notice}</p>}
    <details className="coach-research"><summary>Fontes, escolhas do método e créditos</summary><p>O plano de oito semanas é uma organização prática do método anexado. Os estudos abaixo orientam os alvos fonéticos, sem estabelecer uma ordem universal de dificuldade ou garantir resultados em oito semanas.</p>{data.meta.sources.map(s=><p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> — {s.note}</p>)}<p>Os arquivos ELLLO foram disponibilizados para estudo offline e uso educacional sem fins comerciais. Gravações Commons mantêm sua licença individual; os clipes Tatoeba mantêm autor e atribuição. Os intervalos por palavra são estimados automaticamente e podem ser ajustados no microloop.</p></details>
  </div>;
}
