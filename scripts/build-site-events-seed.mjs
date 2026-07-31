#!/usr/bin/env node
// ============================================================================
// Build script — Seed das caminhadas
// ============================================================================
// Lê os eventos que o site tinha em ../../web/src/content/events/*.json e gera
// supabase/38_site_events_seed.sql, pronto a correr no SQL Editor do Supabase.
// É a migração única dos ficheiros de disco para a tabela site_events; a partir
// daí a agenda passa a ser editada em Outpost (/admin/adventures).
//
// Uso:  cd backoffice && node scripts/build-site-events-seed.mjs
// ============================================================================

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVENTS = join(HERE, "..", "..", "web", "src", "content", "events");
const OUT = join(HERE, "..", "supabase", "38_site_events_seed.sql");

const TYPES = new Set(["adventure", "synergy-open", "workshop", "retreat"]);

function q(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function qArray(list) {
  if (!Array.isArray(list) || list.length === 0) return "'{}'";
  return `ARRAY[${list.map((v) => q(v)).join(", ")}]`;
}

function num(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : "NULL";
}

const files = readdirSync(EVENTS)
  .filter((f) => f.endsWith(".json"))
  .sort();

const rows = files.map((file) => {
  const ev = JSON.parse(readFileSync(join(EVENTS, file), "utf-8"));
  if (!TYPES.has(ev.type)) {
    throw new Error(`${file}: tipo desconhecido "${ev.type}"`);
  }
  const confirmed = ev.date && ev.date !== "TBC";
  return `  (
    ${q(ev.slug)},
    ${q(ev.title)},
    ${q(ev.summary ?? "")},
    ${q(ev.description ?? "")},
    ${confirmed ? `${q(ev.date)}::timestamptz` : "NULL"},
    ${ev.endDate ? `${q(ev.endDate)}::timestamptz` : "NULL"},
    ${confirmed ? "NULL" : q(ev.plannedMonth)},
    ${q(ev.type)}::public.site_event_type,
    ${q(ev.location ?? "")},
    ${q(ev.region)},
    ${num(ev.coordinates?.lat)},
    ${num(ev.coordinates?.lng)},
    ${q(ev.meetingPoint)},
    ${q(ev.distance)},
    ${num(ev.difficulty)},
    ${num(ev.price) === "NULL" ? "0" : num(ev.price)},
    ${num(ev.maxParticipants) === "NULL" ? "0" : num(ev.maxParticipants)},
    ${q(ev.image)},
    ${qArray(ev.images)},
    ${qArray(ev.included)},
    ${qArray(ev.requirements)},
    ${ev.featured ? "true" : "false"}
  )`;
});

const sql = `-- ============================================================================
-- Outpost — Seed das caminhadas (GERADO, não editar à mão)
-- ============================================================================
-- Gerado por backoffice/scripts/build-site-events-seed.mjs a partir dos
-- ficheiros que o site tinha em web/src/content/events/*.json.
--
-- Correr UMA VEZ no Supabase SQL Editor, DEPOIS de 36_site_events.sql.
-- Entram já como publicados, que é como estavam no site. ON CONFLICT DO
-- NOTHING: correr outra vez não apaga o que entretanto editaste em Outpost.
-- ============================================================================

INSERT INTO public.site_events (
  slug, title, summary, description,
  starts_at, ends_at, planned_month,
  type, location, region, lat, lng,
  meeting_point, distance, difficulty, price, max_participants,
  cover_image, images, included, requirements, featured,
  status, published_at
)
-- Os casts são precisos: numa coluna do VALUES em que todas as linhas são
-- NULL, o Postgres infere text e recusa a inserção na coluna tipada.
SELECT
  v.slug, v.title, v.summary, v.description,
  v.starts_at::timestamptz, v.ends_at::timestamptz, v.planned_month,
  v.type, v.location, v.region,
  v.lat::double precision, v.lng::double precision,
  v.meeting_point, v.distance, v.difficulty::smallint,
  v.price::integer, v.max_participants::integer,
  v.cover_image, v.images::text[], v.included::text[], v.requirements::text[],
  v.featured,
  'published', now()
FROM (VALUES
${rows.join(",\n")}
) AS v (
  slug, title, summary, description,
  starts_at, ends_at, planned_month,
  type, location, region, lat, lng,
  meeting_point, distance, difficulty, price, max_participants,
  cover_image, images, included, requirements, featured
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Feito. Verificar (esperado: ${files.length} linhas):
--   SELECT slug, title, status, planned_month FROM public.site_events
--     ORDER BY planned_month, slug;
-- ============================================================================
`;

writeFileSync(OUT, sql, "utf-8");
console.log(`${files.length} caminhadas → ${OUT}`);
