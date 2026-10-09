import type { Category, Sentence } from "../types";
import type { RecorderController } from "../hooks/useRecorder";
import { ClickableText } from "../lib/tokens";

interface SentenceCardProps {
  entry?: Sentence;
  category?: Category;
  situation: string;
  favorite: boolean;
  showTranslation: boolean;
  emptyFavoriteView: boolean;
  recorder: RecorderController;
  onSpeakWord: (word: string) => void;
  onSpeakSentence: () => void;
  onToggleFavorite: () => void;
  onRecord: () => void;
}

export function SentenceCard({
  entry,
  category,
  situation,
  favorite,
  showTranslation,
  emptyFavoriteView,
  recorder,
  onSpeakWord,
  onSpeakSentence,
  onToggleFavorite,
  onRecord,
}: SentenceCardProps) {
  if (!entry) {
    return (
      <article className="sentence-card">
        <div className="empty-state">
          <span className="empty-icon">{emptyFavoriteView ? "☆" : "⌕"}</span>
          <h2>{emptyFavoriteView ? "Sua coleção começa aqui" : "Nenhuma sentença encontrada"}</h2>
          <p>{emptyFavoriteView ? "Toque na estrela de uma sentença para guardá-la." : "Tente outro termo ou remova um dos filtros."}</p>
        </div>
      </article>
    );
  }

  const sourceLabel = entry.origin === "guide" ? `Guia · #${entry.id}` : `Nova · ${entry.id}`;
  const realSpeechURL = `https://youglish.com/pronounce/${encodeURIComponent(entry.english)}/english/us`;
  return (
    <article className="sentence-card" aria-live="polite">
      <div className="card-topline">
        <div>
          <p className="card-category">{category?.title ?? "Inglês"}</p>
          <p className="card-situation">{situation} <span>{sourceLabel}</span></p>
          {entry.audioUrl?.includes("/audio/elevenlabs/") && <p className="card-situation">Voz Chris · elevenlabs.io</p>}
        </div>
        <button
          className={`favorite-button ${favorite ? "active" : ""}`}
          onClick={onToggleFavorite}
          aria-label={favorite ? "Remover das favoritas" : "Adicionar às favoritas"}
          title="Favoritar"
          type="button"
        >
          {favorite ? "★" : "☆"}
        </button>
      </div>
      <div className="sentence-content">
        <div className="word-hint">Toque em uma palavra para ouvi-la</div>
        <h2 className="english-sentence">
          <ClickableText text={entry.english} className="" wordClassName="word-button" onWord={onSpeakWord} />
        </h2>
        {entry.pronunciation && (
          <div className="pronunciation-row">
            <span className="sound-wave" aria-hidden="true"><i /><i /><i /><i /></span>
            <span>{entry.pronunciation}</span>
          </div>
        )}
        {showTranslation ? (
          <div className="translation-block">
            <p className="translation">{entry.portuguese}</p>
            {entry.literalTranslation && <p className="literal-translation"><strong>Ao pé da letra:</strong> {entry.literalTranslation}</p>}
            {entry.usageNote && <p className="usage-note">{entry.usageNote}</p>}
          </div>
        ) : (
          <p className="translation hidden-translation">Tradução oculta para praticar a lembrança.</p>
        )}
      </div>
      <div className="card-actions">
        <button className="listen-button" onClick={onSpeakSentence} type="button"><span aria-hidden="true">▶</span> Ouvir sentença</button>
        <button
          className={`record-button ${recorder.status === "recording" ? "recording" : ""}`}
          onClick={onRecord}
          type="button"
        >
          <span aria-hidden="true">{recorder.status === "recording" ? "■" : "●"}</span>
          {recorder.status === "recording" ? "Parar gravação" : "Gravar minha voz"}
        </button>
        <a className="real-speech-link" href={realSpeechURL} target="_blank" rel="noreferrer">Fala humana real</a>
      </div>
      {recorder.recordingURL && (
        <div className="recording-result">
          <span>Sua última gravação</span>
          <button onClick={recorder.play} type="button">▶ Comparar</button>
          <button onClick={recorder.clear} type="button">Limpar</button>
        </div>
      )}
    </article>
  );
}
