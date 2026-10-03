import { useEffect, useRef, useState } from "react";
import type { SoundPair } from "../types";

export function SoundContrast({ pairs, onResult }: { pairs: SoundPair[]; onResult: (id: string, correct: boolean) => void }) {
  const [pairIndex, setPairIndex] = useState(0);
  const [target, setTarget] = useState(() => Math.random() < .5 ? 0 : 1);
  const [choice, setChoice] = useState<number | null>(null);
  const [heard, setHeard] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const serial = useRef(0);
  const pair = pairs[pairIndex];
  const reset = (next: number) => { serial.current++; audioRef.current?.pause(); setPairIndex(next); setTarget(Math.random()<.5?0:1); setChoice(null); setHeard(false); setError(""); };
  const play = (which = target) => {
    serial.current++; audioRef.current?.pause(); const token=serial.current;
    const audio = new Audio(pair.words[which].audioUrl); audioRef.current=audio;
    audio.onended=()=>{if(token===serial.current)setHeard(true);};
    void audio.play().catch(()=>{if(token===serial.current)setError("Não foi possível tocar este arquivo local.");});
  };
  useEffect(()=>()=>{serial.current++;audioRef.current?.pause();},[]);
  if (!pair) return null;
  return <section className="coach-contrast"><div><p className="eyebrow">Ouvido brasileiro · contraste de sons</p><h3>Qual das duas palavras você ouviu?</h3><p>Esses sons podem cair na mesma categoria do português. Ouça a diferença; depois leve essa percepção às frases.</p></div><label>Contraste<select value={pairIndex} onChange={e=>reset(Number(e.target.value))}>{pairs.map((p,i)=><option value={i} key={p.id}>{p.label}</option>)}</select></label><div className="coach-button-row"><button className="listen-button" onClick={()=>play()} type="button">▶ Ouvir palavra surpresa</button>{pair.words.map((w,i)=><button className={`record-button ${choice===i?(i===target?"correct":"wrong"):""}`} disabled={!heard || choice!==null} key={w.text} onClick={()=>{setChoice(i);onResult(pair.id,i===target);audioRef.current?.pause();}} type="button">{w.text}</button>)}</div>{error&&<p role="alert">{error}</p>}{choice!==null&&<div className="coach-contrast-feedback" aria-live="polite"><strong>{choice===target?"Você distinguiu o som.":`Era ${pair.words[target].text}. Compare as duas gravações.`}</strong><p>{pair.tip}</p><div className="coach-button-row">{pair.words.map((w,i)=><button className="record-button" key={w.text} onClick={()=>play(i)} type="button">▶ {w.text}</button>)}<button className="listen-button" onClick={()=>reset(pairIndex)} type="button">Outra tentativa</button></div><p className="coach-small">Gravações isoladas para diagnóstico; não substituem a escuta em contexto.</p><footer className="coach-credit">{pair.words.map(w=><span key={w.text}>{w.text}: <a href={w.source.url} target="_blank" rel="noreferrer">{w.source.contributor}</a> · <a href={w.source.licenseUrl} target="_blank" rel="noreferrer">{w.source.license}</a>. </span>)}</footer></div>}</section>;
}
