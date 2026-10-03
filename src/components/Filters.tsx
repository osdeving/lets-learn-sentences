import type { Category, Situation, StageId } from "../types";
import type { SpeechController } from "../hooks/useSpeech";
import { LEARNING_STAGES } from "../lib/progression";

interface FiltersProps {
  categories: Category[];
  situations: Situation[];
  query: string;
  categoryId: string;
  situationId: string;
  stageId: StageId | "all";
  speech: SpeechController;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSituationChange: (value: string) => void;
  onStageChange: (value: StageId | "all") => void;
  onShuffle: () => void;
}

export function Filters({
  categories,
  situations,
  query,
  categoryId,
  situationId,
  stageId,
  speech,
  onQueryChange,
  onCategoryChange,
  onSituationChange,
  onStageChange,
  onShuffle,
}: FiltersProps) {
  return (
    <aside className="controls-panel">
      <label className="search-field">
        <span>Buscar</span>
        <input
          type="search"
          placeholder="English ou português…"
          autoComplete="off"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <label>
        <span>Trilha progressiva</span>
        <select value={stageId} onChange={(event) => onStageChange(event.target.value as StageId | "all")}>
          <option value="all">Todas as etapas</option>
          {LEARNING_STAGES.map((stage) => (
            <option key={stage.id} value={stage.id}>{stage.level} · {stage.shortTitle}</option>
          ))}
        </select>
      </label>
      <label>
        <span>Categoria</span>
        <select value={categoryId} onChange={(event) => onCategoryChange(event.target.value)}>
          <option value="all">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.id} · {category.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Situação</span>
        <select value={situationId} onChange={(event) => onSituationChange(event.target.value)}>
          <option value="all">Todas as situações</option>
          {situations.map((situation) => (
            <option key={situation.id} value={situation.id}>{situation.title}</option>
          ))}
        </select>
      </label>
      <div className="voice-block">
        <label>
          <span>Voz</span>
          <select
            disabled={!speech.supported}
            value={speech.voiceURI}
            onChange={(event) => speech.setVoiceURI(event.target.value)}
          >
            {!speech.voices.length && (
              <option value="">{speech.supported ? "Voz padrão em inglês" : "Áudio não disponível"}</option>
            )}
            {speech.voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}</option>
            ))}
          </select>
        </label>
        <div className="speed-control" aria-label="Velocidade da voz">
          <span>Velocidade</span>
          <div>
            {[0.75, 1, 1.15].map((rate) => (
              <button
                className={speech.rate === rate ? "active" : ""}
                key={rate}
                onClick={() => speech.setRate(rate)}
                type="button"
              >
                {String(rate).replace(".", ",")}×
              </button>
            ))}
          </div>
        </div>
      </div>
      <button className="shuffle-button" onClick={onShuffle} type="button">Embaralhar estudo</button>
    </aside>
  );
}
