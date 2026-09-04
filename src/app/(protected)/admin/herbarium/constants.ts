// Vocabulário controlado das fichas. Vive fora de actions.ts porque um módulo
// "use server" só pode exportar funções async, e o formulário (cliente) precisa
// destas listas para desenhar as caixas.
//
// Tem de acompanhar herbarium-web/src/content/species.ts e as chaves de
// tradução em messages/<locale>.json. Acrescentar aqui sem acrescentar lá dá
// uma etiqueta sem nome na app.

export const HERBARIUM_TAGS = [
  "edible",
  "medicinal",
  "aromatic",
  "toxic",
  "irritant",
  "invasive",
  "protected",
] as const;

export const HERBARIUM_HABITATS = [
  "bermas",
  "ribeiros",
  "matos",
  "pinhal",
  "carvalhal",
  "montado",
  "duna",
  "muros",
  "campos",
  "urbano",
  "serra",
] as const;

export const HERBARIUM_STATUSES = ["draft", "review", "published"] as const;

export const TAG_LABELS: Record<(typeof HERBARIUM_TAGS)[number], string> = {
  edible: "Comestível",
  medicinal: "Uso tradicional",
  aromatic: "Aromática",
  toxic: "Tóxica",
  irritant: "Irritante",
  invasive: "Invasora",
  protected: "Protegida",
};

export const HABITAT_LABELS: Record<(typeof HERBARIUM_HABITATS)[number], string> = {
  bermas: "Bermas e baldios",
  ribeiros: "Ribeiros e valas",
  matos: "Matos",
  pinhal: "Pinhal",
  carvalhal: "Carvalhal",
  montado: "Montado",
  duna: "Duna e areal",
  muros: "Muros e pedras",
  campos: "Campos e pastagens",
  urbano: "Cidade e estrada",
  serra: "Serra",
};

/** 0 inofensiva .. 3 mata. Governa a ordem dos blocos na ficha da app. */
export const DANGER_LABELS = [
  "0 · Inofensiva",
  "1 · Incomoda",
  "2 · Intoxica",
  "3 · Pode matar",
];

export const STATUS_LABELS: Record<(typeof HERBARIUM_STATUSES)[number], string> = {
  draft: "Rascunho",
  review: "Por rever",
  published: "Publicada",
};
