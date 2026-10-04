import { useEffect, useMemo, useRef, useState } from "react";
import type { SpeechController } from "../hooks/useSpeech";
import { useListeningQueue } from "../hooks/useListeningQueue";
import { QueueControls } from "../components/QueueControls";
import {
  resolveVocabularyAsset,
  vocabularySegments,
  storyListeningQueue,
} from "./model";
import type { SpokenText, VocabularyData, VocabularyEntry } from "./types";
const asset = (url?: string) =>
  resolveVocabularyAsset(url, import.meta.env.BASE_URL);
export function VocabularyStories({
  data,
  speech,
  onOpenEntry,
}: {
  data: VocabularyData;
  speech: SpeechController;
  onOpenEntry: (id: string) => void;
}) {
  const stories = data.stories ?? [];
  const [storyId, setStoryId] = useState(() => {
    try {
      return sessionStorage.getItem("vocabulary:story") ?? stories[0]?.id;
    } catch {
      return stories[0]?.id;
    }
  });
  const story = stories.find((s) => s.id === storyId) ?? stories[0];
  const [sceneId, setSceneId] = useState(() => {
    try {
      return (
        sessionStorage.getItem("vocabulary:scene:" + story.id) ??
        story.scenes[0].id
      );
    } catch {
      return story.scenes[0].id;
    }
  });
  const [visibleId, setVisibleId] = useState(sceneId);
  const [translation, setTranslation] = useState(true),
    [whole, setWhole] = useState(false);
  const [word, setWord] = useState<VocabularyEntry>();
  useEffect(() => setWord(undefined), [visibleId, story.id]);
  const wordPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (word) wordPanel.current?.focus();
  }, [word]);
  useEffect(() => {
    try {
      sessionStorage.setItem("vocabulary:scene:" + story.id, visibleId);
    } catch {
      /* Optional session memory. */
    }
  }, [story.id, visibleId]);
  const scene = story.scenes.find((s) => s.id === visibleId) ?? story.scenes[0];
  const words = useMemo(
    () => scene.words.map((id) => data.entries.find((e) => e.id === id)!),
    [scene, data],
  );
  const items = useMemo(
    () => storyListeningQueue(story, sceneId, whole, import.meta.env.BASE_URL),
    [story, sceneId, whole],
  );
  const queue = useListeningQueue(
    items,
    "vocabulary:story-queue",
    speech,
    (i) => setVisibleId(items[i].id.split(":")[0]),
  );
  const empty = useMemo(() => [], []);
  const manual = useListeningQueue(empty, "vocabulary:story-manual", speech);
  const stop = () => {
    queue.stop();
    manual.stop();
    speech.cancel();
  };
  const play = (text: SpokenText) => {
    stop();
    manual.start(0, true, [
      { id: text.en, text: text.en, audioUrl: asset(text.audioUrl) },
    ]);
  };
  const changeScene = (id: string) => {
    stop();
    setSceneId(id);
    setVisibleId(id);
    setWord(undefined);
  };
  const linked = (text: string) =>
    vocabularySegments(text, words).map((part, i) =>
      part.entry ? (
        <button
          key={i}
          className="story-word"
          title={part.entry.pt + " · " + part.entry.pronunciation.ipa}
          onClick={() => setWord(part.entry)}
        >
          {part.text}
        </button>
      ) : (
        <span key={i}>{part.text}</span>
      ),
    );
  const activeId = queue.running ? items[queue.index]?.id : "";
  return (
    <section className="vocabulary vocab-stories">
      <header className="vocab-header">
        <div>
          <p className="section-kicker">PALAVRAS DENTRO DE UMA VIDA</p>
          <h2>Histórias do cotidiano</h2>
          <p>
            Acompanhe as conversas. Toque nas palavras destacadas para explorar
            o que está ao redor.
          </p>
        </div>
        <span>
          {stories.length} histórias ·{" "}
          {stories.reduce((n, s) => n + s.scenes.length, 0)} cenas
        </span>
      </header>
      <div className="story-picker">
        {stories.map((s) => (
          <button
            key={s.id}
            aria-pressed={story.id === s.id}
            onClick={() => {
              stop();
              setStoryId(s.id);
              setSceneId(s.scenes[0].id);
              setVisibleId(s.scenes[0].id);
              setWord(undefined);
              try {
                sessionStorage.setItem("vocabulary:story", s.id);
              } catch {
                /* Session persistence is optional. */
              }
            }}
          >
            <img src={asset(s.image)} alt="" />
            <strong>{s.pt}</strong>
            <span lang="en">{s.en}</span>
            <small>{s.description}</small>
          </button>
        ))}
      </div>
      <nav className="vocab-toolbar" aria-label="Cenas da história">
        {story.scenes.map((s, i) => (
          <button
            key={s.id}
            aria-pressed={scene.id === s.id}
            onClick={() => changeScene(s.id)}
          >
            {i + 1}. {s.pt}
          </button>
        ))}
      </nav>
      <div className="story-options">
        <label className="check-row">
          <input
            type="checkbox"
            checked={translation}
            onChange={(e) => setTranslation(e.target.checked)}
          />
          Mostrar tradução
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={whole}
            onChange={(e) => {
              stop();
              setWhole(e.target.checked);
              setVisibleId(sceneId);
            }}
          />
          Ouvir a história inteira, passando pelas cenas
        </label>
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
      </div>
      <p className="story-audio-note">
        Áudio por voz sintética do aparelho; personagens alternam vozes quando
        há mais de uma disponível. Você pode repetir cada fala e ajustar a
        pausa.
      </p>
      <QueueControls
        title={whole ? "Ouvir a história inteira" : "Ouvir esta cena"}
        count={items.length}
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
      />
      {(queue.error || manual.error) && (
        <p role="alert">{queue.error || manual.error}</p>
      )}
      {manual.running && <button onClick={manual.stop}>Parar áudio</button>}
      <div className="story-layout">
        <article className="story-scene">
          <p className="section-kicker">
            {story.pt} · Cena {story.scenes.indexOf(scene) + 1}
          </p>
          <h3 lang="en">
            {scene.en}{" "}
            <button
              aria-label={"Ouvir " + scene.en}
              onClick={() => play(scene)}
            >
              ▷
            </button>
          </h3>
          {translation && <p>{scene.pt}</p>}
          <div
            className={
              "story-setting " +
              (activeId === scene.id + ":setting" ? "speaking" : "")
            }
          >
            <p lang="en">{linked(scene.setting.en)}</p>
            {translation && <p>{scene.setting.pt}</p>}
            <button
              onClick={() => play(scene.setting)}
              aria-label="Ouvir descrição da cena"
            >
              ▷ Ouvir o cenário
            </button>
          </div>
          <ol className="story-dialogue">
            {scene.lines.map((line, i) => (
              <li
                key={scene.id + ":" + i}
                className={activeId === scene.id + ":" + i ? "speaking" : ""}
              >
                <div className="story-speaker">
                  <strong>{line.speaker}</strong>
                  <button
                    aria-label={"Ouvir fala " + (i + 1) + " de " + line.speaker}
                    onClick={() => play(line)}
                  >
                    ▷ Ouvir
                  </button>
                </div>
                <p lang="en">{linked(line.en)}</p>
                {translation && <p className="story-translation">{line.pt}</p>}
              </li>
            ))}
          </ol>
          <div className="vocab-toolbar">
            <button
              disabled={story.scenes.indexOf(scene) === 0}
              onClick={() =>
                changeScene(story.scenes[story.scenes.indexOf(scene) - 1].id)
              }
            >
              ← Cena anterior
            </button>
            <button
              disabled={story.scenes.indexOf(scene) === story.scenes.length - 1}
              onClick={() =>
                changeScene(story.scenes[story.scenes.indexOf(scene) + 1].id)
              }
            >
              Próxima cena →
            </button>
          </div>
        </article>
        <aside className="story-words">
          <h3>O que aparece nesta cena</h3>
          <p>Explore uma palavra sem sair da conversa.</p>
          <div className="story-word-list">
            {words.map((e) => (
              <div key={e.id}>
                <button title={e.pt} onClick={() => setWord(e)}>
                  <span aria-hidden="true">{e.emoji}</span>{" "}
                  <span lang="en">{e.en}</span>
                  {translation && <small>{e.pt}</small>}
                </button>
                <button aria-label={"Ouvir " + e.en} onClick={() => play(e)}>
                  ▷
                </button>
              </div>
            ))}
          </div>
          {word && (
            <section
              className="story-word-detail"
              tabIndex={-1}
              ref={wordPanel}
              aria-label={"Verbete " + word.en}
            >
              <h3 lang="en">
                {word.en}{" "}
                <button
                  aria-label={"Ouvir palavra " + word.en}
                  onClick={() => play(word)}
                >
                  ▷
                </button>
              </h3>
              <p>{word.pt}</p>
              <p>
                {word.pronunciation.ipa} · {word.pronunciation.guide}
              </p>
              {word.examples.map((t) => (
                <div key={t.en}>
                  <button lang="en" onClick={() => play(t)} title={t.pt}>
                    ▷ {t.en}
                  </button>
                  <p>{t.pt}</p>
                </div>
              ))}
              {word.notes?.map((n, i) => (
                <p key={i}>{n.text}</p>
              ))}
              <button
                onClick={() => {
                  stop();
                  onOpenEntry(word.id);
                }}
              >
                Abrir verbete completo ↗
              </button>
              <button onClick={() => setWord(undefined)}>Fechar verbete</button>
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}
