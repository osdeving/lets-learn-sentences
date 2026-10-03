import type { Level, StageId } from "../types";

export interface LearningStage {
  id: StageId;
  level: Level;
  title: string;
  shortTitle: string;
  description: string;
  categoryIds: string[];
}

export const LEARNING_STAGES: LearningStage[] = [
  {
    id: "foundation",
    level: "A1",
    title: "Etapa 1 · Fundamentos",
    shortTitle: "Fundamentos",
    description: "Cumprimentos, necessidades, localização, tempo e padrões que sustentam as primeiras conversas.",
    categoryIds: ["01", "02", "03", "09", "12", "13", "22"],
  },
  {
    id: "daily",
    level: "A2",
    title: "Etapa 2 · Vida cotidiana",
    shortTitle: "Cotidiano",
    description: "Compras, comida, deslocamento, saúde, lazer e pequenas decisões do dia a dia.",
    categoryIds: ["04", "05", "07", "08", "19", "21", "23", "24", "27"],
  },
  {
    id: "independent",
    level: "B1",
    title: "Etapa 3 · Autonomia",
    shortTitle: "Autonomia",
    description: "Trabalho, estudo, tecnologia, problemas e conversas que exigem explicar e negociar.",
    categoryIds: ["10", "11", "14", "15", "16", "17", "18", "20", "26", "28"],
  },
  {
    id: "natural",
    level: "B2",
    title: "Etapa 4 · Naturalidade",
    shortTitle: "Naturalidade",
    description: "Opiniões, sentimentos, relações, gírias, idioms e fala conectada em ritmo natural.",
    categoryIds: ["06", "25", "29", "30", "31"],
  },
  {
    id: "advanced",
    level: "C1",
    title: "Etapa 5 · Nuance",
    shortTitle: "Nuance",
    description: "Argumentação, implicação, registro e escolhas de linguagem em situações complexas.",
    categoryIds: ["32"],
  },
  {
    id: "mastery",
    level: "C2",
    title: "Etapa 6 · Domínio",
    shortTitle: "Domínio",
    description: "Ironia, ambiguidade, ritmo natural e formulações densas com precisão de sentido.",
    categoryIds: ["33"],
  },
];

export function stageForCategory(categoryId: string): LearningStage {
  return LEARNING_STAGES.find((stage) => stage.categoryIds.includes(categoryId)) ?? LEARNING_STAGES[0];
}

export function levelForCategory(categoryId: string): Level {
  return stageForCategory(categoryId).level;
}
