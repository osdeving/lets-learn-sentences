import { VocabularyView } from "./vocabulary/VocabularyView";
import { HumanSourcesView } from "./components/HumanSourcesView";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DialogueView } from "./components/DialogueView";
import { AudioLibraryView } from "./components/AudioLibraryView";
import { Filters } from "./components/Filters";
import { Header } from "./components/Header";
import { GrammarView } from "./components/GrammarView";
import { ListeningPractice } from "./components/ListeningPractice";
import { DecodingCoach } from "./components/DecodingCoach";
import { StoriesView } from "./components/StoriesView";
import { QueueControls } from "./components/QueueControls";
import { useListeningQueue } from "./hooks/useListeningQueue";
import { SentenceCard } from "./components/SentenceCard";
import { Tabs } from "./components/Tabs";
import { useRecorder } from "./hooks/useRecorder";
import { useSpeech } from "./hooks/useSpeech";
import { useWebMCP } from "./hooks/useWebMCP";
import { formatNumber, loadContent, normalize, situationTitle } from "./lib/content";
import { stageForCategory } from "./lib/progression";
import { readStoredSet, STORAGE, writeStoredSet } from "./lib/storage";
import type { ContentData, StageId, ViewMode } from "./types";

export default function App() {
  const [content, setContent] = useState<ContentData | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<ViewMode>(location.hash.startsWith("#audio=") ? "audio" : location.hash.startsWith("#vocabulary") ? "vocabulary" : "decoding");
  const [grammarTarget, setGrammarTarget] = useState<string>();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [situationId, setSituationId] = useState("all");
  const [stageId, setStageId] = useState<StageId | "all">("all");
  const [index, setIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(true);
  const [favorites, setFavorites] = useState(() => readStoredSet(STORAGE.favorites));
  const [studied, setStudied] = useState(() => readStoredSet(STORAGE.studied));
  const [shuffleRanks, setShuffleRanks] = useState<Map<string, number> | null>(null);
  const [pendingEntryId, setPendingEntryId] = useState(() => localStorage.getItem(STORAGE.lastEntry) ?? "");
  const [toast, setToast] = useState("");
  const speech = useSpeech();
  const recorder = useRecorder();

  useEffect(() => {
    let active = true;
    loadContent()
      .then((result) => {
        if (active) setContent(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Falha ao carregar o conteúdo");
      });
    return () => { active = false; };
  }, []);

  const showToast = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const visibleSituations = useMemo(() => {
    if (!content) return [];
    return content.situations.filter(
      (situation) => (categoryId === "all" || situation.categoryId === categoryId) &&
        (stageId === "all" || stageForCategory(situation.categoryId).id === stageId),
    );
  }, [categoryId, content, stageId]);

  const visibleCategories = useMemo(() => content?.categories.filter(
    (category) => stageId === "all" || stageForCategory(category.id).id === stageId,
  ) ?? [], [content, stageId]);

  const filtered = useMemo(() => {
    if (!content) return [];
    const needle = normalize(query.trim());
    const source = view === "favorites"
      ? content.sentences.filter((entry) => favorites.has(entry.id))
      : content.sentences;
    const result = source.filter((entry) => {
      if (categoryId !== "all" && entry.categoryId !== categoryId) return false;
      if (stageId !== "all" && stageForCategory(entry.categoryId).id !== stageId) return false;
      if (situationId !== "all" && entry.situationId !== situationId) return false;
      if (!needle) return true;
      return [entry.id, entry.english, entry.portuguese, entry.pronunciation, situationTitle(entry, content.situations)]
        .some((value) => normalize(value).includes(needle));
    });
    if (shuffleRanks) {
      result.sort((a, b) => (shuffleRanks.get(a.id) ?? 0) - (shuffleRanks.get(b.id) ?? 0));
    }
    return result;
  }, [categoryId, content, favorites, query, shuffleRanks, situationId, stageId, view]);

  useEffect(() => {
    if (!pendingEntryId || !filtered.length) return;
    const requestedIndex = filtered.findIndex((entry) => entry.id === pendingEntryId);
    if (requestedIndex >= 0) setIndex(requestedIndex);
    setPendingEntryId("");
  }, [filtered, pendingEntryId]);

  useEffect(() => {
    if (index >= filtered.length) setIndex(0);
  }, [filtered.length, index]);

  const current = filtered[index];
  useEffect(() => {
    if (!current) return;
    localStorage.setItem(STORAGE.lastEntry, current.id);
    recorder.clear();
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const markStudied = useCallback((id: string) => {
    setStudied((currentSet) => {
      if (currentSet.has(id)) return currentSet;
      const next = new Set(currentSet).add(id);
      writeStoredSet(STORAGE.studied, next);
      return next;
    });
  }, []);

  const queueItems = useMemo(() => filtered.map(entry => ({ id: entry.id, text: entry.english, audioUrl: entry.audioUrl })), [filtered]);
  const queue = useListeningQueue(queueItems, "ouvir-ingles:sentence-queue", speech, setIndex, markStudied);

  const speakEntry = useCallback(() => {
    if (!current) return;
    queue.start(index, true);
  }, [current, index, queue]);

  const speakWord = useCallback((word: string) => {
    queue.stop();
    if (current) markStudied(current.id);
    speech.speak(word);
  }, [current, markStudied, speech, queue.stop]);

  const toggleFavorite = useCallback((id: string): boolean | null => {
    if (!content?.sentences.some((entry) => entry.id === id)) return null;
    const result = !favorites.has(id);
    setFavorites((currentSet) => {
      const next = new Set(currentSet);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeStoredSet(STORAGE.favorites, next);
      return next;
    });
    return result;
  }, [content, favorites]);

  const handleFavorite = useCallback(() => {
    if (!current) return;
    const wasFavorite = favorites.has(current.id);
    toggleFavorite(current.id);
    showToast(wasFavorite ? "Removida das favoritas" : "Guardada nas favoritas");
  }, [current, favorites, showToast, toggleFavorite]);

  const openSentence = useCallback((id: string): boolean => {
    if (!content?.sentences.some((entry) => entry.id === id)) return false;
    setView("sentences");
    setQuery("");
    setCategoryId("all");
    setSituationId("all");
    setStageId("all");
    setShuffleRanks(null);
    setPendingEntryId(id);
    return true;
  }, [content]);

  useWebMCP({ sentences: content?.sentences ?? [], openSentence, toggleFavorite });

  const move = useCallback((direction: number) => {
    if (!filtered.length) return;
    queue.stop();
    speech.cancel();
    setIndex((currentIndex) => (currentIndex + direction + filtered.length) % filtered.length);
  }, [filtered.length, speech, queue.stop]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).matches("input, select, button, a")) return;
      if (view !== "sentences" && view !== "favorites") return;
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
      if (event.key === " ") {
        event.preventDefault();
        speakEntry();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [move, speakEntry, view]);

  const shuffle = useCallback(() => {
    if (!content || filtered.length < 2) return;
    setShuffleRanks(new Map(content.sentences.map((entry) => [entry.id, Math.random()])));
    setIndex(0);
    showToast("Ordem de estudo embaralhada");
  }, [content, filtered.length, showToast]);

  const handleRecord = useCallback(async () => {
    queue.stop();
    speech.cancel();
    const result = await recorder.toggle();
    if (result === "unsupported") showToast("Gravação não disponível neste navegador");
    if (result === "denied") showToast("Permita o microfone para gravar sua voz");
    if (result === "stopped") showToast("Gravação pronta para comparar");
  }, [recorder, showToast, queue.stop, speech]);

  const switchView = useCallback((nextView: ViewMode) => {
    queue.stop();
    speech.cancel();
    setView(nextView);
    setIndex(0);
  }, [speech, queue.stop]);

  if (error) {
    return (
      <main className="fatal-state">
        <span className="empty-icon">!</span>
        <h1>Não foi possível abrir o conteúdo</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (!content) {
    return <div className="app-loading"><span /><p>Preparando as sentenças…</p></div>;
  }

  const studiedCount = [...studied].filter((id) => content.sentences.some((entry) => entry.id === id)).length;
  const elevenLabsCount = content.sentences.filter(entry => entry.audioProvider === "ElevenLabs" || entry.audioUrl?.includes("/audio/elevenlabs/")).length;
  const recordingCount = new Set([
    ...content.sentences.map(entry => entry.audioUrl),
    ...content.audioClips.map(clip => clip.audioUrl),
    ...content.dialogues.map(dialogue => dialogue.audioUrl),
    ...content.stories.map(story => story.audioUrl),
    ...content.decoding.clips.map(clip => clip.audioUrl),
    ...content.decoding.pairs.flatMap(pair => pair.words.map(word => word.audioUrl)),
  ].filter(Boolean)).size;
  const category = content.categories.find((item) => item.id === current?.categoryId);
  const situation = current ? situationTitle(current, content.situations) : "";
  const resultLabel = view === "favorites"
    ? `${formatNumber(filtered.length)} ${filtered.length === 1 ? "favorita" : "favoritas"}`
    : `${formatNumber(filtered.length)} ${filtered.length === 1 ? "sentença" : "sentenças"}`;

  return (
    <div className="app-shell" id="top">
      <Header studiedCount={studiedCount} totalCount={content.sentences.length} />
      <main>
        <section className="intro" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">Inglês para a vida real</p>
            <h1 id="page-title">Ouça. Entenda. <em>Repita.</em></h1>
          </div>
          <div className="stats" aria-label="Conteúdo disponível">
            <span><strong>{formatNumber(content.sentences.length)}</strong> sentenças</span>
            <span><strong>{formatNumber(content.dialogues.length)}</strong> diálogos</span>
            <span><strong>{formatNumber(recordingCount)}</strong> gravações</span>
            <span><strong>{formatNumber(content.stories.length)}</strong> histórias</span>
            <span><strong>{formatNumber(content.grammar.length + content.decoding.lessons.length)}</strong> lições</span>
          </div>
        </section>

        <Tabs active={view} favoriteCount={favorites.size} onChange={switchView} />

        {view === "vocabulary" ? (
          <VocabularyView speech={speech} onGrammar={id => { setGrammarTarget(id); setView("grammar"); }} />
        ) : view === "decoding" ? (
          <DecodingCoach data={content.decoding} />
        ) : view === "audio" ? (
          <AudioLibraryView clips={content.audioClips} initialClipId={location.hash.startsWith("#audio=") ? decodeURIComponent(location.hash.slice(7)) : undefined} />
        ) : view === "sources" ? (
          <HumanSourcesView />
        ) : view === "stories" ? (
          <>
            <div className="vocab-toolbar"><button className="listen-button" onClick={() => { speech.cancel(); location.hash = "vocabulary-stories"; setView("vocabulary"); }}>Explorar histórias do cotidiano com vocabulário →</button></div>
            <StoriesView stories={content.stories} speech={speech} />
          </>
        ) : view === "dialogues" ? (
          <DialogueView
            dialogues={content.dialogues}
            speech={speech}
            onSpeakLine={speech.speak}
            onSpeakDialogue={speech.speakSequence}
          />
        ) : view === "practice" ? (
          <ListeningPractice content={content} speech={speech} />
        ) : view === "grammar" ? (
          <GrammarView initialLessonId={grammarTarget} lessons={content.grammar} onSpeak={speech.speak} />
        ) : (
          <section className="workspace">
            <Filters
              categories={visibleCategories}
              situations={visibleSituations}
              query={query}
              categoryId={categoryId}
              situationId={situationId}
              stageId={stageId}
              speech={speech}
              onQueryChange={(value) => { setQuery(value); setIndex(0); }}
              onCategoryChange={(value) => { setCategoryId(value); setSituationId("all"); setIndex(0); }}
              onSituationChange={(value) => { setSituationId(value); setIndex(0); }}
              onStageChange={(value) => { setStageId(value); setCategoryId("all"); setSituationId("all"); setIndex(0); }}
              onShuffle={shuffle}
            />
            <div className="study-stage">
              <div className="result-row">
                <span>{resultLabel}</span>
                <button
                  className="compact-toggle"
                  onClick={() => setShowTranslation((value) => !value)}
                  type="button"
                >
                  {showTranslation ? "Ocultar tradução" : "Mostrar tradução"}
                </button>
              </div>
              <QueueControls settings={queue.settings} onChange={queue.configure} running={queue.running} repetition={queue.repetition} onStart={() => { speech.cancel(); queue.start(index); }} onStop={queue.stop} disabled={!current || recorder.status === "recording"} count={filtered.length} />
              {queue.error && <p className="coach-notice" role="alert">{queue.error}</p>}
              <SentenceCard
                entry={current}
                category={category}
                situation={situation}
                favorite={Boolean(current && favorites.has(current.id))}
                showTranslation={showTranslation}
                emptyFavoriteView={view === "favorites" && favorites.size === 0}
                recorder={recorder}
                onSpeakWord={speakWord}
                onSpeakSentence={speakEntry}
                onToggleFavorite={handleFavorite}
                onRecord={handleRecord}
              />
              <div className="deck-nav">
                <button disabled={filtered.length < 2} onClick={() => move(-1)} type="button">Anterior</button>
                <span>{filtered.length ? `${formatNumber(index + 1)} / ${formatNumber(filtered.length)}` : "0 / 0"}</span>
                <button disabled={filtered.length < 2} onClick={() => move(1)} type="button">Próxima</button>
              </div>
            </div>
          </section>
        )}
      </main>
      <footer>
        <p>{formatNumber(elevenLabsCount)} sentenças com voz do ElevenLabs · <a href="https://elevenlabs.io" target="_blank" rel="noreferrer">elevenlabs.io</a>. As sentenças sem MP3 usam a voz do aparelho.</p>
        <p>Áudios humanos de ELLLO, Tatoeba, Wikimedia Commons e VOA.</p>
        <p><a href={`${import.meta.env.BASE_URL}contribuir.html`}>Catálogo de áudio e como contribuir</a></p>
        <p>Progresso, favoritas e gravações ficam neste aparelho.</p>
      </footer>
      <div className={`toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
