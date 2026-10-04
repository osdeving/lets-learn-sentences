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
        <div className="section-kicker">Teoria e prática de gramática</div>
        <h2>Entenda os padrões</h2>
        <p>Aprenda quando usar cada estrutura, compare os padrões e ouça os exemplos. As primeiras lições apresentam os fundamentos.</p>
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
          {active.theory && (
            <section className="grammar-theory" aria-label="Explicação teórica">
              <h3>Como escolher a forma certa</h3>
              <ol>{active.theory.rules.map((rule) => <li key={rule}>{rule}</li>)}</ol>
              <div className="grammar-table-scroll" role="region" aria-label="Tabela de padrões" tabIndex={0}>
                <table>
                  <caption>Compare os padrões</caption>
                  <thead><tr><th scope="col">Quando usar</th><th scope="col">Forma</th><th scope="col">Exemplo em inglês</th></tr></thead>
                  <tbody>{active.theory.rows.map((row) => <tr key={row.when}><th scope="row">{row.when}</th><td>{row.form}</td><td><button type="button" onClick={() => onSpeak(row.example)} aria-label={`Ouvir: ${row.example}`}>▶ {row.example}</button></td></tr>)}</tbody>
                </table>
              </div>
            </section>
          )}
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
