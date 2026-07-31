/**
 * Regiões reconhecidas pelo site público. Tem de continuar alinhado com
 * REGIONS em web/src/types/event.ts — é esse mapa que dá o nome e a posição
 * no mapa de Portugal. Guardamos só o código (texto) na base de dados.
 */
export const SITE_REGIONS: { code: string; label: string }[] = [
  { code: "leiria", label: "Leiria" },
  { code: "aire-candeeiros", label: "Serra de Aire e Candeeiros" },
  { code: "estrela", label: "Serra da Estrela" },
  { code: "peneda-geres", label: "Peneda-Gerês" },
  { code: "costa-vicentina", label: "Costa Vicentina" },
  { code: "douro", label: "Alto Douro" },
  { code: "sintra-cascais", label: "Sintra-Cascais" },
  { code: "santiago", label: "Caminho de Santiago (Norte)" },
  { code: "fatima", label: "Fátima e Ourém" },
  { code: "arouca", label: "Arouca (Passadiços do Paiva)" },
  { code: "pinhal", label: "Pinhal Interior (Figueiró)" },
  { code: "virtual", label: "Online / Virtual" },
];

export const EVENT_TYPE_LABELS: Record<string, string> = {
  adventure: "🌿 Adventures",
  "synergy-open": "🏢 Synergy (aberto)",
  workshop: "🏢 Workshop",
  retreat: "⛺ Retiro",
};

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "1 · Muito fácil",
  2: "2 · Fácil",
  3: "3 · Moderado",
  4: "4 · Difícil",
  5: "5 · Muito difícil",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};
