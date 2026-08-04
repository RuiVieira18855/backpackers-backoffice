import {
  doublePrecision,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { profiles } from "./foundations";

export const trailEstadoEnum = pgEnum("trail_estado", [
  "por triar",
  "ideia",
  "a reconhecer",
  "reconhecido",
  "ficha operacional",
  "activo no site",
]);

export const trailConfiancaEnum = pgEnum("trail_confianca", [
  "alta",
  "média",
  "baixa",
]);

/**
 * Biblioteca de trilhos: catálogo interno de percursos pedestres de onde saem
 * as caminhadas da agenda (./site-events.ts).
 *
 * Referência, não conteúdo de site: o anon não lê esta tabela. Boa parte das
 * linhas vem de agregador e ainda não foi triada, por isso `dificuldade` e
 * `tema` estão vazios em muitas: atribuí-los sem alguém ter feito o percurso
 * seria inventar. `confianca` diz o que está verificado em fonte oficial.
 */
export const trailLibrary = pgTable(
  "trail_library",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Identificador estável do CSV de origem. Chave da re-importação. */
    ref: text("ref").notNull(),

    nome: text("nome").notNull(),
    codigo: text("codigo"),
    rede: text("rede"),

    concelho: text("concelho"),
    distrito: text("distrito"),
    regiao: text("regiao"),
    areaProtegida: text("area_protegida"),
    /** Ponto de partida. Passa para o evento ao criar a caminhada, senão o
     *  percurso não aparece no mapa interactivo do site. */
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),

    /** NULL quando a fonte não publica. Permite ordenar sem casos especiais. */
    distanciaKm: numeric("distancia_km", { precision: 6, scale: 2 }),
    tipo: text("tipo"),
    desnivel: text("desnivel"),
    duracao: text("duracao"),
    dificuldade: smallint("dificuldade"),
    tema: text("tema"),
    epoca: text("epoca"),

    autorizacao: text("autorizacao"),
    /** Máximo de participantes sem autorização prévia. No PNPG há trilhos a 10. */
    limiteGrupo: integer("limite_grupo"),
    viagemLeiriaMin: integer("viagem_leiria_min"),
    potencial: text("potencial"),

    estado: trailEstadoEnum("estado").notNull().default("por triar"),
    avisos: text("avisos"),
    confianca: trailConfiancaEnum("confianca").notNull().default("média"),
    fonte: text("fonte"),
    notas: text("notas"),

    updatedBy: uuid("updated_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("trail_library_ref_idx").on(t.ref),
    index("trail_library_regiao_idx").on(t.regiao),
    index("trail_library_estado_idx").on(t.estado),
    index("trail_library_potencial_idx").on(t.potencial, t.viagemLeiriaMin),
  ],
);

export const trailLibraryRelations = relations(trailLibrary, ({ one }) => ({
  updatedByProfile: one(profiles, {
    fields: [trailLibrary.updatedBy],
    references: [profiles.id],
    relationName: "trail_library_updated_by",
  }),
}));

export type TrailRow = typeof trailLibrary.$inferSelect;
export type NewTrailRow = typeof trailLibrary.$inferInsert;
