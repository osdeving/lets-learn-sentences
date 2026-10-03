import { useEffect } from "react";
import type { Sentence } from "../types";
import { normalize } from "../lib/content";

interface WebMCPOptions {
  sentences: Sentence[];
  openSentence: (id: string) => boolean;
  toggleFavorite: (id: string) => boolean | null;
}

export function useWebMCP({ sentences, openSentence, toggleFavorite }: WebMCPOptions): void {
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool || !sentences.length) return;
    const safeRegister = (tool: WebMCPTool) => {
      try {
        void Promise.resolve(context.registerTool(tool)).catch(() => undefined);
      } catch {
        // WebMCP is progressive enhancement and may be unavailable.
      }
    };

    safeRegister({
      name: "search_sentences",
      title: "Buscar sentenças",
      description: "Busca expressões do guia por texto em inglês ou português.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 20 },
        },
        required: ["query"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const query = typeof input.query === "string" ? input.query.trim() : "";
        const limit = typeof input.limit === "number" ? Math.min(20, Math.max(1, input.limit)) : 10;
        if (!query) throw new Error("query must be a non-empty string");
        const needle = normalize(query);
        return sentences
          .filter((entry) => normalize(`${entry.english} ${entry.portuguese}`).includes(needle))
          .slice(0, limit)
          .map(({ id, english, portuguese }) => ({ id, english, portuguese }));
      },
    });

    safeRegister({
      name: "open_sentence",
      title: "Abrir sentença",
      description: "Abre uma sentença no cartão principal usando seu ID.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (typeof input.id !== "string" || !openSentence(input.id)) {
          throw new Error("Sentence ID not found");
        }
        const entry = sentences.find((item) => item.id === input.id)!;
        return { id: entry.id, english: entry.english, portuguese: entry.portuguese };
      },
    });

    safeRegister({
      name: "toggle_sentence_favorite",
      title: "Alternar favorita",
      description: "Adiciona ou remove uma sentença da coleção de favoritas.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const favorite = typeof input.id === "string" ? toggleFavorite(input.id) : null;
        if (favorite === null) throw new Error("Sentence ID not found");
        return { id: input.id, favorite };
      },
    });
  }, [openSentence, sentences, toggleFavorite]);
}
