import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Herbarium — fichas de flora ibérica de trilho.
 *
 * Escritas aqui, no Outpost, e lidas por duas apps: o guia de campo
 * (herbarium-web) e o deck "Flora" do Trailhead, que usa as mesmas fichas como
 * cartas. Conteúdo global de marca, sem tenant e sem pilar.
 *
 * A tabela vive no Supabase partilhado e o SQL canónico é sql/18_herbarium.sql
 * (com as políticas RLS). Este schema espelha-o para o Drizzle poder ler e
 * escrever a partir do backoffice.
 *
 * Regra de conteúdo que a coluna `danger` serve: ela decide se o aviso de risco
 * aparece ANTES ou depois do texto na app. Não é metadado decorativo.
 */
export const herbariumSpecies = pgTable(
  "herbarium_species",
  {
    slug: text("slug").primaryKey(),
    scientificName: text("scientific_name").notNull(),
    family: text("family").notNull(),

    namePt: text("name_pt"),
    nameEn: text("name_en"),
    nameEs: text("name_es"),
    akaPt: text("aka_pt").array().notNull().default(sql`'{}'`),
    akaEn: text("aka_en").array().notNull().default(sql`'{}'`),
    akaEs: text("aka_es").array().notNull().default(sql`'{}'`),

    habitat: text("habitat").array().notNull().default(sql`'{}'`),
    monthsFlower: integer("months_flower").array().notNull().default(sql`'{}'`),
    monthsFruit: integer("months_fruit").array().notNull().default(sql`'{}'`),

    tags: text("tags").array().notNull().default(sql`'{}'`),
    danger: smallint("danger").notNull().default(0),

    summaryPt: text("summary_pt"),
    summaryEn: text("summary_en"),
    summaryEs: text("summary_es"),
    fieldMarksPt: text("field_marks_pt"),
    fieldMarksEn: text("field_marks_en"),
    fieldMarksEs: text("field_marks_es"),
    usesPt: text("uses_pt"),
    usesEn: text("uses_en"),
    usesEs: text("uses_es"),
    legalNotePt: text("legal_note_pt"),
    legalNoteEn: text("legal_note_en"),
    legalNoteEs: text("legal_note_es"),

    lookalikes: jsonb("lookalikes").notNull().default(sql`'[]'::jsonb`),
    images: jsonb("images").notNull().default(sql`'[]'::jsonb`),
    sources: jsonb("sources").notNull().default(sql`'[]'::jsonb`),

    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("herbarium_species_status_idx").on(t.status),
    index("herbarium_species_danger_idx").on(t.danger),
  ],
);

/**
 * Fotografias enviadas por utilizadores. A tabela existe antes da
 * funcionalidade, de propósito: as regras de privacidade ficam decididas na
 * estrutura, e não a correr atrás dela.
 *
 * - a coordenada guarda-se arredondada a ~1 km (protege a pessoa e as espécies
 *   raras de quem lê o mapa);
 * - `consentTraining` é uma decisão separada de usar a app;
 * - a app remove o EXIF no cliente antes de enviar.
 */
export const herbariumSubmissions = pgTable(
  "herbarium_submissions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    imagePath: text("image_path").notNull(),
    speciesSlug: text("species_slug"),
    suggested: jsonb("suggested").notNull().default(sql`'[]'::jsonb`),
    latGrid: text("lat_grid"),
    lonGrid: text("lon_grid"),
    consentPublic: text("consent_public"),
    consentTraining: text("consent_training"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("herbarium_submissions_status_idx").on(t.status)],
);

export type HerbariumSpeciesRow = typeof herbariumSpecies.$inferSelect;
export type NewHerbariumSpeciesRow = typeof herbariumSpecies.$inferInsert;
