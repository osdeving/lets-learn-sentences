import { VocabularyStories } from "./VocabularyStories";
import { useEffect, useMemo, useState } from "react";
import type { SpeechController } from "../hooks/useSpeech";
import { useListeningQueue } from "../hooks/useListeningQueue";
import { QueueControls } from "../components/QueueControls";
import { readStoredSet } from "../lib/storage";
import {
  entryFromHash,
  filterVocabulary,
  resolveVocabularyAsset,
  reviewChoices,
  vocabularyQueue,
} from "./model";
import type { SpokenText, VocabularyData, VocabularyEntry } from "./types";
import "./vocabulary.css";
const base = import.meta.env.BASE_URL;
const asset = (path: string) => resolveVocabularyAsset(path, base);
const levels: Record<string, string> = {
  common: "Comum",
  specific: "Específico",
  technical: "Técnico",
};
export function VocabularyView({
  speech,
  onGrammar,
}: {
  speech: SpeechController;
  onGrammar: (id: string) => void;
}) {
  const [mode, setMode] = useState(
    location.hash.startsWith("#vocabulary-stories") ? "stories" : "explore",
  );
  const [data, setData] = useState<VocabularyData>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    fetch(base + "data/vocabulary/catalog.json", {
      cache: "no-cache",
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error("Não foi possível carregar o vocabulário.");
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(String(e.message));
      });
    return () => controller.abort();
  }, [attempt]);
  if (error)
    return (
      <section className="vocabulary">
        <p role="alert">{error}</p>
        <button onClick={() => setAttempt((a) => a + 1)}>
          Tentar novamente
        </button>
      </section>
    );
  return data ? (
    <>
      <nav className="vocab-toolbar" aria-label="Como aprender vocabulário">
        <button
          aria-pressed={mode === "explore"}
          onClick={() => setMode("explore")}
        >
          Explorar palavras
        </button>
        {!!data.stories?.length && (
          <button
            aria-pressed={mode === "stories"}
            onClick={() => setMode("stories")}
          >
            Histórias do cotidiano
          </button>
        )}
      </nav>
      {mode === "stories" ? (
        <VocabularyStories
          data={data}
          speech={speech}
          onOpenEntry={(id) => {
            location.hash = "vocabulary/" + id;
            setMode("explore");
          }}
        />
      ) : (
        <VocabularyExplorer data={data} speech={speech} onGrammar={onGrammar} />
      )}
    </>
  ) : (
    <p role="status">Preparando o vocabulário…</p>
  );
}
function VocabularyExplorer({
  data,
  speech,
  onGrammar,
}: {
  data: VocabularyData;
  speech: SpeechController;
  onGrammar: (id: string) => void;
}) {
  const [category, setCategory] = useState("all"),
    [group, setGroup] = useState("all"),
    [frequency, setFrequency] = useState("all"),
    [query, setQuery] = useState("");
  const [saved, setSaved] = useState(() => readStoredSet("vocabulary:saved")),
    [savedOnly, setSavedOnly] = useState(false);
  const [selected, setSelected] = useState(
    entryFromHash(location.hash) ?? data.entries[0].id,
  );
  const [examples, setExamples] = useState(true),
    [review, setReview] = useState(false),
    [question, setQuestion] = useState(0),
    [answer, setAnswer] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = useMemo(
    () =>
      filterVocabulary(data, {
        category,
        group,
        frequency,
        query,
        savedOnly,
        saved,
      }),
    [data, category, group, frequency, query, savedOnly, saved],
  );
  const items = useMemo(
    () => vocabularyQueue(filtered, examples, base),
    [filtered, examples],
  );
  const queue = useListeningQueue(items, "vocabulary:queue", speech, (i) =>
    setSelected(items[i].id.split(":")[0]),
  );
  const manualItems = useMemo(() => [], []);
  const manual = useListeningQueue(manualItems, "vocabulary:manual", speech);
  const stop = () => {
    queue.stop();
    manual.stop();
    speech.cancel();
  };
  useEffect(() => {
    manual.stop();
    speech.cancel();
  }, [filtered]);
  const say = (text: SpokenText, slow = false) => {
    stop();
    manual.start(0, true, [
      {
        id: text.en,
        text: text.en,
        audioUrl: asset(text.audioUrl ?? ""),
        rate: slow ? 0.7 : speech.rate,
      },
    ]);
  };
  const audio = (text: SpokenText, compact = false) => (
    <button
      type="button"
      className="vocab-speak"
      title={text.pt}
      aria-label={"Ouvir " + text.en}
      onClick={() => say(text)}
    >
      <span aria-hidden="true">▷</span>{" "}
      {!compact && <span lang="en">{text.en}</span>}
      <span className="vocab-tooltip">{text.pt}</span>
    </button>
  );
  useEffect(() => {
    const open = () => {
      const id = entryFromHash(location.hash);
      if (id && data.entries.some((e) => e.id === id)) {
        setSelected(id);
        setCategory("all");
        setGroup("all");
        setQuery("");
        setFrequency("all");
        setSavedOnly(false);
        setReview(false);
      }
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [data]);
  const entry = filtered.find((e) => e.id === selected) ?? filtered[0];
  const currentCategory = data.categories.find((c) => c.id === category);
  const target = filtered[question % Math.max(1, filtered.length)];
  const choices = useMemo(
    () => (target ? reviewChoices(data.entries, target) : []),
    [data, target],
  );
  useEffect(() => {
    setAnswer("");
    setQuestion(0);
  }, [filtered]);
  const toggleSave = (e: VocabularyEntry) => {
    const next = new Set(saved);
    next.has(e.id) ? next.delete(e.id) : next.add(e.id);
    setSaved(next);
    try {
      localStorage.setItem("vocabulary:saved", JSON.stringify([...next]));
    } catch {
      setNotice("Não foi possível salvar neste navegador.");
    }
  };
  const selectCategory = (id: string) => {
    stop();
    setCategory(id);
    setGroup("all");
    setQuery("");
  };
  return (
    <section className="vocabulary">
      <header className="vocab-header">
        <div>
          <p className="section-kicker">VOCABULÁRIO EM CONTEXTO</p>
          <h2>Palavras que vivem juntas</h2>
          <p>
            Explore o cotidiano, descubra diferenças e escute palavras dentro de
            frases.
          </p>
        </div>
        <div className="vocab-count">
          <strong>{data.entries.length}</strong> verbetes ·{" "}
          {data.categories.length} universos
        </div>
      </header>
      <div className="vocab-categories">
        <button
          className={category === "all" ? "active" : ""}
          onClick={() => selectCategory("all")}
        >
          ✦<strong>Todos os universos</strong>
        </button>
        {data.categories.map((c) => (
          <div
            className={"vocab-category " + (category === c.id ? "active" : "")}
            key={c.id}
          >
            <button
              onClick={() => selectCategory(c.id)}
              aria-pressed={category === c.id}
            >
              <img src={asset(c.image)} alt="" />
              <strong>{c.pt}</strong>
            </button>
            {audio(c)}
          </div>
        ))}
      </div>
      {currentCategory && (
        <section className="vocab-context">
          <div>
            <h3>{currentCategory.pt}</h3>
            <p>{currentCategory.description}</p>
            <div className="vocab-groups">
              <button
                className={group === "all" ? "active" : ""}
                onClick={() => setGroup("all")}
              >
                Todos
              </button>
              {currentCategory.groups.map((g) => (
                <div key={g.id}>
                  <button
                    className={group === g.id ? "active" : ""}
                    onClick={() => setGroup(g.id)}
                  >
                    {g.pt}
                  </button>
                  {audio(g, true)}
                </div>
              ))}
            </div>
          </div>
          {currentCategory.hotspots && (
            <div className="vocab-map">
              <img
                src={asset(currentCategory.image)}
                alt="Mapa do corpo: escolha uma região"
              />
              {currentCategory.hotspots.map((h) => (
                <button
                  key={h.group}
                  style={{ left: h.x + "%", top: h.y + "%" }}
                  onClick={() => setGroup(h.group)}
                  title={
                    currentCategory.groups.find((g) => g.id === h.group)?.pt
                  }
                  aria-label={
                    currentCategory.groups.find((g) => g.id === h.group)?.pt
                  }
                >
                  +
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      <div className="vocab-filters">
        <label>
          Buscar em inglês ou português
          <input
            value={query}
            placeholder="Ex.: pia, tap, pé, sore…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Tipo de palavra
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          >
            <option value="all">Todos</option>
            {Object.entries(levels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={savedOnly}
            onChange={(e) => setSavedOnly(e.target.checked)}
          />
          Só meus salvos ({saved.size})
        </label>
      </div>
      <div className="vocab-toolbar">
        <button
          aria-pressed={!review}
          onClick={() => {
            stop();
            setReview(false);
          }}
        >
          Explorar
        </button>
        <button
          aria-pressed={review}
          onClick={() => {
            stop();
            setReview(true);
          }}
        >
          Desafio de escuta
        </button>
        <span>{filtered.length} verbetes na seleção</span>
      </div>
      <details className="vocab-settings">
        <summary>Voz, pronúncia e dicas de uso</summary>
        <p>{data.pronunciationNote}</p>
        <p>
          Áudio inicial: voz sintética do aparelho. Gravações podem ser
          adicionadas por verbete e frase. Passe o mouse ou dê foco ao botão de
          áudio para ver a tradução. “Específico” indica contexto mais restrito;
          “técnico”, terminologia especializada.
        </p>
        <label>
          Voz inglesa
          <select
            value={speech.voiceURI}
            onChange={(e) => {
              stop();
              speech.setVoiceURI(e.target.value);
            }}
          >
            <option value="">Padrão do aparelho</option>
            {speech.voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} · {v.lang}
              </option>
            ))}
          </select>
        </label>
        {!speech.supported && (
          <p role="alert">
            Este navegador não oferece voz sintética. Verbetes com gravações
            ainda podem ser ouvidos.
          </p>
        )}
      </details>
      {!review && (
        <>
          <label className="check-row">
            <input
              type="checkbox"
              checked={examples}
              onChange={(e) => {
                stop();
                setExamples(e.target.checked);
              }}
            />
            Na escuta automática, incluir a frase de cada palavra
          </label>
          <QueueControls
            settings={queue.settings}
            onChange={queue.configure}
            running={queue.running}
            repetition={queue.repetition}
            onStart={() => {
              manual.stop();
              speech.cancel();
              queue.start();
            }}
            onStop={queue.stop}
            disabled={!items.length}
            count={items.length}
          />
          {queue.running && (
            <p role="status">
              Ouvindo: <span lang="en">{items[queue.index]?.text}</span>
            </p>
          )}
        </>
      )}
      {manual.running && (
        <p role="status">
          Reproduzindo áudio… <button onClick={manual.stop}>Parar áudio</button>
        </p>
      )}
      {(queue.error || manual.error || notice) && (
        <p role="alert">{queue.error || manual.error || notice}</p>
      )}
      {!filtered.length ? (
        <p className="vocab-empty">
          Nenhum verbete nesta seleção. Tente outra busca ou remova um filtro.
        </p>
      ) : review && target ? (
        <section className="vocab-quiz">
          <p className="section-kicker">DESAFIO {question + 1}</p>
          <h3>O que você ouviu?</h3>
          <button className="listen-button" onClick={() => say(target)}>
            ▶ Ouvir palavra do desafio
          </button>
          {!speech.supported && <p lang="en">{target.en}</p>}
          <div className="vocab-choices">
            {choices.map((c) => (
              <button
                key={c.id}
                disabled={!!answer}
                onClick={() => setAnswer(c.id)}
              >
                {c.pt}
              </button>
            ))}
          </div>
          {answer && (
            <div role="status">
              <p>
                {answer === target.id
                  ? "✓ Isso mesmo!"
                  : "Vamos fixar: a resposta é " + target.pt + "."}
              </p>
              <h3>
                {audio(target)} · {target.pt}
              </h3>
              {audio(target.examples[0])}
              <p>{target.examples[0].pt}</p>
              <button
                onClick={() => {
                  stop();
                  setAnswer("");
                  setQuestion((q) => q + 1);
                }}
              >
                Próxima palavra →
              </button>
              <button
                onClick={() => {
                  setSelected(target.id);
                  setReview(false);
                }}
              >
                Explorar este verbete
              </button>
            </div>
          )}
        </section>
      ) : (
        entry && (
          <div className="vocab-layout">
            <aside className="vocab-list" aria-label="Verbetes">
              {filtered.map((e) => (
                <div key={e.id} className={e.id === entry.id ? "active" : ""}>
                  <button
                    onClick={() => {
                      stop();
                      setSelected(e.id);
                    }}
                    aria-current={e.id === entry.id ? "true" : undefined}
                  >
                    <span aria-hidden="true">{e.emoji}</span>
                    <span>
                      <strong lang="en">{e.en}</strong>
                      <small>{e.pt}</small>
                    </span>
                    {saved.has(e.id) && "★"}
                  </button>
                  {audio(e, true)}
                </div>
              ))}
            </aside>
            <article className="vocab-entry" key={entry.id}>
              <div className="vocab-entry-top">
                <div>
                  <p className="section-kicker">
                    {data.categories.find((c) => c.id === entry.category)?.pt} ·{" "}
                    {levels[entry.frequency]}
                  </p>
                  <h2>{audio(entry)}</h2>
                  <p className="vocab-translation">{entry.pt}</p>
                  <p>
                    <span lang="en">{entry.pronunciation.ipa}</span> ·{" "}
                    {entry.pronunciation.guide}
                  </p>
                  <button onClick={() => say(entry, true)}>
                    Ouvir devagar
                  </button>
                  <button
                    aria-pressed={saved.has(entry.id)}
                    onClick={() => toggleSave(entry)}
                  >
                    {saved.has(entry.id) ? "★ Salvo" : "☆ Salvar"}
                  </button>
                </div>
                {entry.image ? (
                  <img
                    className="vocab-art"
                    src={asset(entry.image.src)}
                    alt={entry.image.alt}
                  />
                ) : (
                  <span
                    className="vocab-emoji"
                    role="img"
                    aria-label={entry.pt}
                  >
                    {entry.emoji}
                  </span>
                )}
              </div>
              {entry.pronunciation.tip && <p>{entry.pronunciation.tip}</p>}
              {entry.plural && (
                <p>
                  Plural:{" "}
                  {audio({ en: entry.plural, pt: "Plural de " + entry.pt })}
                </p>
              )}
              <h3>Na vida real</h3>
              {entry.examples.map((t) => (
                <div className="vocab-example" key={t.en}>
                  {audio(t)}
                  <p>{t.pt}</p>
                </div>
              ))}
              {entry.chunks && (
                <>
                  <h3>Combinações que você vai ouvir</h3>
                  {entry.chunks.map((t) => (
                    <div className="vocab-example" key={t.en}>
                      {audio(t)}
                      <p>{t.pt}</p>
                    </div>
                  ))}
                </>
              )}
              {entry.variants && (
                <>
                  <h3>Outras formas — e suas diferenças</h3>
                  {entry.variants.map((v) => (
                    <div className="vocab-note" key={v.en}>
                      {audio(v)}
                      <p>
                        {v.pt}
                        {v.pronunciation ? " · " + v.pronunciation : ""}
                      </p>
                      <p>{v.note}</p>
                    </div>
                  ))}
                </>
              )}
              {entry.notes?.map((n, i) => (
                <p className="vocab-note" key={i}>
                  {n.text}
                </p>
              ))}
              {entry.related && (
                <>
                  <h3>Continue explorando</h3>
                  <div className="vocab-related">
                    {entry.related.map((id) => {
                      const related = data.entries.find((e) => e.id === id)!;
                      return (
                        <div key={id}>
                          <a href={"#vocabulary/" + id} title={related.pt}>
                            {related.emoji} <span lang="en">{related.en}</span>
                          </a>
                          {audio(related, true)}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {entry.grammar && (
                <div className="vocab-related">
                  {entry.grammar.map((id) => (
                    <button
                      key={id}
                      onClick={() => {
                        stop();
                        onGrammar(id);
                      }}
                    >
                      Ver gramática · {id} ↗
                    </button>
                  ))}
                </div>
              )}
              {entry.sources && (
                <details>
                  <summary>Referência para aprofundar</summary>
                  {entry.sources.map((url) => (
                    <p key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        Consultar dicionário ↗
                      </a>
                    </p>
                  ))}
                </details>
              )}
            </article>
          </div>
        )
      )}
    </section>
  );
}
