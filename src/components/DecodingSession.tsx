import { useEffect, useMemo, useRef, useState } from "react";
import type { DecodingClip, DecodingLesson, ListeningError } from "../types";
import type { ListeningAttempt } from "../lib/decoding";
import { characterDiff, compareDictation, ERROR_LABELS } from "../lib/decoding";
import { useClipPlayer } from "../hooks/useClipPlayer";
import { useRecorder } from "../hooks/useRecorder";

export interface CoachSettings { autoAdvance: boolean; repeats: number; gap: number; minutes: number; speaker: string }
export interface SessionPlan { clips: DecodingClip[]; lesson?: DecodingLesson; mode: ListeningAttempt["mode"]; title: string }
const STEPS = ["Ouvir", "Escrever", "Comparar", "Microloop", "Imitar", "Sem texto"];
export function DecodingSession({ plan, settings, onAttempt, onFinish, onLeave }: {
  plan: SessionPlan; settings: CoachSettings;
  onAttempt: (attempt: ListeningAttempt, effort: "again" | "hard" | "easy") => void;
  onFinish: () => void; onLeave: () => void;
}) {
  const [index, setIndex] = useState(0);
  const clip = plan.clips[index];
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [blindAnswer, setBlindAnswer] = useState("");
  const [blindResult, setBlindResult] = useState<ReturnType<typeof compareDictation> | null>(null);
  const [listens, setListens] = useState(0);
  const [blindHeard, setBlindHeard] = useState(false);
  const [tags, setTags] = useState<ListeningError[]>([]);
  const [range, setRange] = useState<[number, number]>([clip.start, clip.end]);
  const [selectedWords, setSelectedWords] = useState<[number, number]>([0, Math.max(0, clip.words.length - 1)]);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [slowUsed, setSlowUsed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoNext, setAutoNext] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [notice, setNotice] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(0);
  const nextTimerRef = useRef(0);
  const shadowTimerRef = useRef(0);
  const player = useClipPlayer();
  const recorder = useRecorder();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const diff = useMemo(() => compareDictation(clip.english, answer), [answer, clip.english]);
  const revealed = step >= 2 && step <= 4;
  const reviewOnly = plan.mode === "review" || plan.mode === "transfer";

  useEffect(() => {
    timerRef.current = window.setInterval(() => { if (!paused && !completed) setElapsed(n => n + 1); }, 1000);
    return () => window.clearInterval(timerRef.current);
  }, [completed, paused]);
  useEffect(() => () => { window.clearTimeout(nextTimerRef.current); window.clearTimeout(shadowTimerRef.current); }, []);
  useEffect(() => { if (step === 1) answerRef.current?.focus(); if (step === 5) textareaRef.current?.focus(); }, [step]);

  const playWhole = (blind = false, repeats = 1) => {
    if (paused) return;
    void player.play(clip.audioUrl, clip.start, clip.end, { repeats, gap: settings.gap,
      onComplete: () => { if (blind) setBlindHeard(true); else setListens(n => n + repeats); },
    });
  };
  const changeStep = (value: number) => {
    player.stop(); window.clearTimeout(shadowTimerRef.current); recorder.clear(); setNotice(""); setStep(value);
    if (value === 5) { setBlindAnswer(""); setBlindHeard(false); setBlindResult(null); }
  };
  const compare = () => {
    changeStep(2);
    const missing = diff.tokens.filter(t => t.kind !== "match").map(t => t.expected);
    const wordIndex = clip.words.findIndex(w => missing.some(t => w.text.toLowerCase().replace(/[^a-z']/g, "") === t));
    if (wordIndex >= 0) selectRange(Math.max(0, wordIndex - 1), Math.min(clip.words.length - 1, wordIndex + 2));
  };
  const selectRange = (from: number, to: number) => {
    const low = Math.min(from, to), high = Math.max(from, to);
    setSelectedWords([low, high]);
    const start = Math.max(clip.start, clip.words[low].start - 0.05);
    const end = Math.min(clip.end, clip.words[high].end + 0.08);
    setRange([start, Math.max(start + 0.08, end)]);
  };
  const selectWord = (wordIndex: number) => {
    if (anchor === null) { setAnchor(wordIndex); selectRange(wordIndex, wordIndex); }
    else { selectRange(anchor, wordIndex); setAnchor(null); }
  };
  const next = () => {
    window.clearTimeout(nextTimerRef.current); player.stop(); recorder.clear();
    if (index + 1 === plan.clips.length) { setCompleted(true); onFinish(); return; }
    const nextClip = plan.clips[index + 1];
    setIndex(index + 1); setStep(reviewOnly ? 5 : 0); setAnswer(""); setBlindAnswer(""); setBlindResult(null);
    setListens(0); setBlindHeard(false); setTags([]); setRange([nextClip.start, nextClip.end]);
    setSelectedWords([0, Math.max(0, nextClip.words.length - 1)]); setAnchor(null); setSlowUsed(false); setSaved(false); setAutoNext(false); setNotice("");
    if (settings.autoAdvance) void player.play(nextClip.audioUrl, nextClip.start, nextClip.end, { onComplete: () => {
      if (reviewOnly) setBlindHeard(true); else setListens(1);
    } });
  };
  const grade = (effort: "again" | "hard" | "easy") => {
    if (!blindResult || saved) return;
    setSaved(true);
    onAttempt({ id: crypto.randomUUID(), clipId: clip.id, lessonId: plan.lesson?.id ?? "", at: Date.now(), mode: plan.mode,
      initialScore: reviewOnly ? blindResult.score : diff.score, blindScore: blindResult.score,
      errors: tags, slowUsed, listens: listens + 1,
    }, effort);
    if (settings.autoAdvance && effort !== "again" && blindResult.score >= 95) {
      setAutoNext(true);
      nextTimerRef.current = window.setTimeout(next, 1200);
    }
  };
  const testBlind = () => { if (blindAnswer.trim() && blindHeard) { player.stop(); setBlindResult(compareDictation(clip.english, blindAnswer)); } };
  const shadow = (delayed: boolean) => {
    void player.play(clip.audioUrl, clip.start, clip.end, { repeats: settings.repeats, gap: delayed ? Math.max(settings.gap, (clip.end - clip.start) * 1000) : settings.gap });
    setNotice(delayed ? "Entre um instante depois da voz. Use a pausa entre repetições para repetir sozinho." : "Fale junto: copie o ritmo e as palavras fracas.");
  };
  const record = async () => {
    player.stop(); const result = await recorder.toggle();
    if (result === "denied") setNotice("O navegador precisa da permissão do microfone para gravar.");
    if (result === "unsupported") setNotice("Gravação indisponível neste navegador. Você pode imitar sem gravar.");
  };
  const togglePause = () => { player.stop(); setAutoNext(false); window.clearTimeout(nextTimerRef.current); window.clearTimeout(shadowTimerRef.current); setPaused(v => !v); };
  useEffect(() => {
    if (reviewOnly) setStep(5);
    // A session always starts with a user gesture; no playback during mount.
  }, [reviewOnly]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest("input, textarea, select, button, a")) return;
      if (event.code === "Space") { event.preventDefault(); if (player.playing) player.stop(); else playWhole(step === 5); }
    };
    window.addEventListener("keydown", handle); return () => window.removeEventListener("keydown", handle);
  });

  if (completed) return <section className="coach-complete"><p className="eyebrow">Sessão concluída</p><h2>Agora, deixe o ouvido descansar.</h2><p>{plan.clips.length} trechos praticados. As revisões foram agendadas com seu resultado e esforço.</p><p>O próximo encontro com esse áudio começa sem texto. Testes feitos em outro dia medem sua retenção.</p><button className="listen-button" onClick={onLeave} type="button">Voltar à trilha</button></section>;

  return <section className={`coach-session ${paused ? "paused" : ""}`}>
    <header className="coach-session-head"><div><p className="eyebrow">{plan.title}</p><h2>Trecho {index + 1} de {plan.clips.length}</h2></div><div className="coach-top-actions"><span role="timer">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span><button onClick={togglePause} type="button">{paused ? "Retomar" : "Pausar"}</button><button onClick={() => { player.stop(); onLeave(); }} type="button">Sair da sessão</button></div></header>
    <ol className="coach-stepper" aria-label="Ciclo de listening">{STEPS.map((label, i) => <li key={label} className={i === step ? "active" : i < step ? "done" : ""} aria-current={i === step ? "step" : undefined}><span>{i < step ? "✓" : i + 1}</span>{label}</li>)}</ol>
    {paused ? <div className="coach-pause"><h3>Faça uma pausa.</h3><p>Respire, solte os ombros e volte quando estiver pronto.</p><button className="listen-button" onClick={togglePause} type="button">Retomar sessão</button></div> : <div className="coach-session-grid">
      <article className="coach-exercise" aria-labelledby="exercise-title">
        <div className="coach-meta"><span>{clip.speaker} · voz humana</span><span>{(clip.end - clip.start).toFixed(1)} s · 1×</span></div>
        <h3 id="exercise-title">{["Primeiro, só o som.", "O que você ouviu?", "Onde o som virou outra coisa?", "Repita o trecho que escapou.", "Copie o ritmo da voz.", "Agora, ouça sem olhar."][step]}</h3>
        <p className="coach-instruction">{[
          "Ouça duas ou três vezes sem legenda. Procure as palavras, sem traduzir uma por uma.",
          "Escreva sua hipótese em inglês. Se faltar uma parte, escreva o que conseguiu reconhecer.",
          "Compare sua hipótese com o original. Marque a dificuldade que você percebeu.",
          "Clique na primeira e na última palavra do trecho. Ouça 5–10 vezes em velocidade real e depois volte à frase.",
          "Imite primeiro um pouco depois da voz, depois ao mesmo tempo. A gravação é opcional.",
          reviewOnly ? "A revisão começa sem pistas. Escreva novamente o que você ouviu." : "A transcrição foi escondida. Ouça em 1× e faça um novo ditado; a revisão em outro dia confirmará a retenção.",
        ][step]}</p>
        {(step < 2 || step === 5) && <div className="coach-blind-player"><button className={`audio-orb ${player.playing ? "playing" : ""}`} onClick={() => player.playing ? player.stop() : playWhole(step === 5, step === 0 ? 2 : 1)} type="button" aria-label={player.playing ? "Parar áudio" : "Ouvir sem texto"}><span>{player.playing ? "■" : "▶"}</span>{player.playing ? "Parar" : "Ouvir em 1×"}</button><small>{step === 5 ? blindHeard ? "Áudio ouvido. Registre sua hipótese." : "Ouça o trecho para começar." : `${listens} reproduções completas`}</small></div>}
        {step === 0 && <button className="listen-button coach-next-step" disabled={listens < 1} onClick={() => changeStep(1)} type="button">Escrever o que ouvi →</button>}
        {step === 1 && <form onSubmit={e => { e.preventDefault(); if (answer.trim()) compare(); }} className="coach-dictation"><label htmlFor="first-dictation">Seu primeiro ditado</label><textarea id="first-dictation" ref={answerRef} value={answer} onChange={e => setAnswer(e.target.value)} spellCheck={false} autoCapitalize="off" autoComplete="off" rows={3} placeholder="Digite em inglês, mesmo que seja só um pedaço…" /><button className="listen-button" disabled={!answer.trim()} type="submit">Revelar e comparar</button></form>}
        {revealed && <div className="coach-revealed">
          <p className="coach-original" lang="en">{clip.english}</p>
          <button className="coach-text-play" onClick={() => playWhole()} type="button">▶ Frase completa · 1×</button>
          {step === 2 && <><div className="coach-comparison"><div><strong>Você escreveu</strong><p lang="en">{answer}</p></div><div><strong>Palavras reconhecidas · {diff.score}%</strong><p className="word-diff" lang="en">{diff.tokens.map((token, i) => <span className={token.kind} key={i} title={token.kind === "changed" ? `Você escreveu: ${token.heard}` : token.kind === "missing" ? "Não apareceu no seu ditado" : token.kind === "extra" ? "Palavra acrescentada" : "Reconhecida"}>{token.expected || `+${token.heard}`} </span>)}</p></div></div><p className="coach-small">Pontuação compara palavras; aceita contrações equivalentes e ignora pontuação. Não avalia sua pronúncia.</p><details><summary>Ver comparação caractere por caractere</summary><p className="char-diff" lang="en">{characterDiff(clip.english, answer).map((c,i) => <span className={c.changed ? "changed" : ""} key={i}>{c.text}</span>)}</p></details>
            <fieldset className="coach-error-tags"><legend>O que dificultou? Você pode marcar mais de um.</legend>{Object.entries(ERROR_LABELS).map(([key,label]) => <label key={key}><input type="checkbox" checked={tags.includes(key as ListeningError)} onChange={e => setTags(v => e.target.checked ? [...v, key as ListeningError] : v.filter(x => x !== key))} />{label}</label>)}</fieldset>
            <div className="coach-listening-note"><strong>Escute este detalhe</strong><p>{clip.note}</p></div><details><summary>Tradução, depois de ouvir</summary><p>{clip.portuguese}</p></details><button className="listen-button coach-next-step" onClick={() => changeStep(3)} type="button">Criar microloop →</button></>}
          {step === 3 && <><div className="coach-word-selection" aria-label="Selecionar intervalo do microloop" lang="en">{clip.words.map((w,i) => <button type="button" className={i >= selectedWords[0] && i <= selectedWords[1] ? "selected" : ""} key={i} onClick={() => selectWord(i)}>{w.text}</button>)}</div><p className="coach-small">{anchor === null ? "Clique no início e no fim para selecionar um chunk." : "Agora clique na última palavra do trecho."} Intervalos automáticos; ajuste as bordas abaixo se necessário.</p><div className="coach-range-controls"><label>Início (s)<input type="number" min={clip.start} max={range[1] - 0.05} step="0.05" value={Number(range[0].toFixed(2))} onChange={e => { const n=Number(e.target.value); setRange(v => [Math.max(clip.start, Math.min(n,v[1]-.05)),v[1]]); }} /></label><label>Fim (s)<input type="number" min={range[0] + .05} max={clip.end} step="0.05" value={Number(range[1].toFixed(2))} onChange={e => { const n=Number(e.target.value); setRange(v => [v[0],Math.min(clip.end,Math.max(n,v[0]+.05))]); }} /></label></div><div className="coach-button-row"><button className="listen-button" onClick={() => void player.play(clip.audioUrl,range[0],range[1],{repeats:settings.repeats,gap:settings.gap})} type="button">▶ Loop {settings.repeats}× · 1×</button><button className="record-button" onClick={() => { setSlowUsed(true); void player.play(clip.audioUrl,range[0],range[1],{rate:.9}); }} type="button">Diagnóstico · 0,9×</button><button className="record-button" onClick={player.stop} type="button">Parar</button></div><p className="coach-small" role="status">{player.playing ? `Repetição ${player.repetition}/${settings.repeats}` : "Depois do loop, escute a frase completa em 1×."}</p><button className="listen-button coach-next-step" onClick={() => changeStep(4)} type="button">Imitar a voz →</button></>}
          {step === 4 && <><div className="coach-button-row"><button className="listen-button" onClick={() => shadow(true)} type="button">▶ Imitar com atraso</button><button className="record-button" onClick={() => shadow(false)} type="button">▶ Falar junto</button><button className="record-button" onClick={player.stop} type="button">Parar</button></div><div className="coach-recording"><button className={`record-button ${recorder.status === "recording" ? "recording" : ""}`} onClick={() => void record()} type="button">{recorder.status === "recording" ? "■ Encerrar gravação" : "● Gravar minha imitação"}</button>{recorder.recordingURL && <audio controls src={recorder.recordingURL} aria-label="Sua gravação local" />}<p className="coach-small">A gravação fica nesta sessão, no aparelho. Compare ritmo, pausas e palavras fracas.</p></div><button className="listen-button coach-next-step" onClick={() => changeStep(5)} type="button">Esconder texto e testar →</button></>}
        </div>}
        {step === 5 && !blindResult && <form className="coach-dictation" onSubmit={e => {e.preventDefault();testBlind();}}><label htmlFor="blind-dictation">Novo ditado sem texto</label><textarea id="blind-dictation" ref={textareaRef} value={blindAnswer} onChange={e=>setBlindAnswer(e.target.value)} spellCheck={false} autoComplete="off" autoCapitalize="off" rows={3} placeholder="O que você reconheceu desta vez?" /><button className="listen-button" disabled={!blindHeard || !blindAnswer.trim()} type="submit">Conferir este teste</button></form>}
        {step === 5 && blindResult && <div className="coach-blind-result" aria-live="polite"><p className="coach-result-number">{blindResult.score}%</p><h4>{reviewOnly ? "Resultado sem pistas" : "Resultado logo após estudar"}</h4><p className="coach-small">{reviewOnly ? "Só revisões feitas pelo menos 20 horas depois entram no indicador de retenção." : "O teste de hoje mostra reconhecimento imediato. A revisão futura vai medir retenção."}</p><p lang="en">{clip.english}</p><p className="coach-small">Seu ditado: {blindAnswer}</p>{reviewOnly && <fieldset className="coach-error-tags"><legend>Algum trecho ainda escapou?</legend>{Object.entries(ERROR_LABELS).map(([key,label])=><label key={key}><input type="checkbox" checked={tags.includes(key as ListeningError)} onChange={e=>setTags(v=>e.target.checked?[...v,key as ListeningError]:v.filter(x=>x!==key))} />{label}</label>)}</fieldset>}<p>Como foi reconhecer esse áudio?</p><div className="coach-button-row"><button className="record-button" disabled={saved} onClick={()=>grade("again")} type="button">Preciso repetir · 10 min</button><button className="record-button" disabled={saved} onClick={()=>grade("hard")} type="button">Com esforço · 1 dia</button><button className="listen-button" disabled={saved} onClick={()=>grade("easy")} type="button">Claro em 1×</button></div>{saved && <><p className="coach-small" role="status">Revisão salva. {autoNext ? "O próximo trecho começa automaticamente." : "Avance quando quiser ou pratique novamente."}</p><button className="listen-button" onClick={next} type="button">{index+1===plan.clips.length?"Concluir sessão":"Próximo trecho →"}</button>{!autoNext && <button className="record-button" onClick={() => { player.stop(); recorder.clear(); setAnswer(""); setBlindAnswer(""); setBlindResult(null); setBlindHeard(false); setListens(0); setSaved(false); setStep(0); }} type="button">Praticar este trecho novamente</button>}</>}</div>}
        {player.error && <div className="coach-notice" role="alert"><p>{player.error}</p><button className="record-button" onClick={()=>playWhole(step === 5,step === 0 ? 2 : 1)} type="button">Tentar tocar novamente</button><details><summary>Detalhes do áudio</summary><p>{player.errorDetail}</p></details></div>}{notice && <p className="coach-notice" role="status">{notice}</p>}
        <footer className="coach-credit">Áudio: <a href={clip.source.url} target="_blank" rel="noreferrer">{clip.source.publisher}</a> · {clip.source.contributor} · <a href={clip.source.licenseUrl} target="_blank" rel="noreferrer">{clip.source.license}</a></footer>
      </article>
      <aside className="coach-session-side"><p className="section-kicker">Uma variável por vez</p><h3>{plan.lesson?.title ?? plan.title}</h3><p>{plan.lesson?.objective ?? "Reconhecer o som em velocidade real, sem apoio do texto."}</p>{revealed && plan.lesson && <><h4>O padrão de hoje</h4><p>{plan.lesson.explanation}</p><h4>Experimente</h4><p>{plan.lesson.task}</p></>}<div className="coach-session-tip"><strong>Uma frase vale o tempo que precisar.</strong><p>Não é uma corrida. Faça pausas, repita o chunk difícil e volte ao contexto.</p></div><small>Espaço: tocar / parar · Enter no botão: avançar</small></aside>
    </div>}
  </section>;
}
