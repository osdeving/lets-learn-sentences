import type { ViewMode } from "../types";

interface TabsProps {
  active: ViewMode;
  favoriteCount: number;
  onChange: (view: ViewMode) => void;
}

export function Tabs({ active, favoriteCount, onChange }: TabsProps) {
  const tabs: Array<{ id: ViewMode; label: string }> = [
    { id: "decoding", label: "Método listening" },
    { id: "vocabulary", label: "Vocabulário" },
    { id: "sentences", label: "Sentenças" },
    { id: "audio", label: "Áudios" },
    { id: "mr-english", label: "Mr. English" },
    { id: "sources", label: "Mais vozes humanas" },
    { id: "stories", label: "Histórias" },
    { id: "dialogues", label: "Diálogos" },
    { id: "practice", label: "Treino" },
    { id: "grammar", label: "Gramática" },
    { id: "favorites", label: "Favoritas" },
  ];
  return (
    <nav className="mode-tabs" aria-label="Modo de estudo">
      {tabs.map((tab) => (
        <button
          className={`tab ${active === tab.id ? "active" : ""}`}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          type="button"
        >
          {tab.label}
          {tab.id === "favorites" && <span>{favoriteCount.toLocaleString("pt-BR")}</span>}
        </button>
      ))}
    </nav>
  );
}
