import { useMemo, useState } from "react";
import type { GrammarLesson, Level } from "../types";

interface GrammarViewProps {
  lessons: GrammarLesson[];
  onSpeak: (text: string) => void;
}

export function GrammarView({ lessons, onSpeak }: GrammarViewProps) {
  const [level, setLevel] = useState<Level | "all">("all");
  const [selectedId, setSelectedId] = useState(lessons[0]?.id ?? "");
  const visible = useMemo(() => lessons.filter((lesson) => level === "all" || lesson.level === level), [lessons, level]);
  const active = visible.find((lesson) => lesson.id === selectedId) ?? visible[0];

  return (
    <section className="grammar-view">
      <aside className="grammar-nav">
        <div className="section-kicker">Gramática que ajuda a ouvir</div>
        <h2>Do padrão ao som</h2>
        <p>Leia a regra curta, depois ouça os exemplos procurando o trecho destacado pela explicação.</p>
        <label><span>Nível</span><select value={level} onChange={(event) => { setLevel(event.target.value as Level | "all"); setSelectedId(""); }}><option value="all">Todos os níveis</option>{["A1", "A2", "B1", "B2", "C1", "C2"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <div className="grammar-list">
          {visible.map((lesson) => (
            <button className={lesson.id === active?.id ? "active" : ""} key={lesson.id} onClick={() => setSelectedId(lesson.id)} type="button"><span>{lesson.level}</span>{lesson.title}</button>
          ))}
        </div>
      </aside>
      {active && (
        <article className="grammar-card">
          <header><p className="card-category">{active.level} · {active.id}</p><h2>{active.title}</h2><p>{active.summary}</p></header>
          <div className="pattern-box"><span>Padrão</span><strong>{active.pattern}</strong></div>
          <div className="grammar-notes">
            <div><span aria-hidden="true">◖</span><p><strong>Para ouvir</strong>{active.listeningTip}</p></div>
            <div><span aria-hidden="true">!</span><p><strong>Erro comum</strong>{active.commonMistake}</p></div>
          </div>
          <div className="grammar-examples">
            <h3>Ouça o padrão em contexto</h3>
            {active.examples.map((example, index) => (
              <button key={example.english} onClick={() => onSpeak(example.english)} type="button">
                <span className="example-play">▶</span>
                <span><strong>{example.english}</strong><small>{example.portuguese}</small></span>
                <i>{String(index + 1).padStart(2, "0")}</i>
              </button>
            ))}
          </div>
          <a className="reference-link" href={active.sourceUrl} target="_blank" rel="noreferrer">Abrir referência do British Council ↗</a>
        </article>
      )}
    </section>
  );
}
