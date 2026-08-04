#!/usr/bin/env node
// ============================================================================
// Build script — Seed da biblioteca de trilhos
// ============================================================================
// Lê estrategia/adventures/biblioteca-trilhos/trilhos.csv e gera
// supabase/40_trail_library_seed.sql.
//
// Re-importável: faz UPSERT por `ref`, e só toca nas colunas que vêm da fonte.
// O que se preenche em Outpost ao triar (dificuldade, tema, potencial, estado,
// notas) NÃO é sobreposto quando já tem valor, para uma re-importação não
// apagar trabalho de triagem.
//
// Uso:  cd backoffice && node scripts/build-trail-library-seed.mjs
// ============================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CSV = join(
  HERE, "..", "..", "estrategia", "adventures", "biblioteca-trilhos", "trilhos.csv",
);
const OUT = join(HERE, "..", "supabase", "40_trail_library_seed.sql");

const ESTADOS = new Set([
  "por triar","ideia","a reconhecer","reconhecido","ficha operacional","activo no site",
]);
const CONFIANCAS = new Set(["alta", "média", "baixa"]);

const raw = readFileSync(CSV, "utf-8").replace(/^﻿/, "").trim();
const linhas = raw.split(/\r?\n/);
const cols = linhas[0].split(";");
const idx = (n) => {
  const i = cols.indexOf(n);
  if (i < 0) throw new Error(`coluna em falta no CSV: ${n}`);
  return i;
};

const I = {
  id: idx("id"), nome: idx("nome"), codigo: idx("codigo"), rede: idx("rede"),
  concelho: idx("concelho"), distrito: idx("distrito"), regiao: idx("regiao"),
  area: idx("area_protegida"), km: idx("distancia_km"), tipo: idx("tipo"),
  desnivel: idx("desnivel_m"), duracao: idx("duracao_h"), dif: idx("dificuldade"),
  tema: idx("tema"), epoca: idx("epoca"), autoriz: idx("autorizacao"),
  limite: idx("limite_grupo"), viagem: idx("viagem_leiria_min"),
  potencial: idx("potencial"), estado: idx("estado"), avisos: idx("avisos"),
  confianca: idx("confianca"), fonte: idx("fonte"),
};

// "[CONFIRMAR]" e "n/a" são buracos assumidos no CSV. Na base de dados são NULL.
const VAZIO = new Set(["", "[CONFIRMAR]", "n/a", "nenhuma"]);
const txt = (v) => (VAZIO.has((v ?? "").trim()) ? null : v.trim());

function q(v) {
  const s = txt(v);
  return s === null ? "NULL" : `'${s.replace(/'/g, "''")}'`;
}
function numero(v) {
  const s = txt(v);
  if (s === null) return "NULL";
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? String(n) : "NULL";
}
function inteiro(v) {
  const s = txt(v);
  if (s === null) return "NULL";
  // "15 (etapas 2/8/13/14/18) e 10 (etapa 3)" -> o limite mais restritivo.
  const nums = [...s.matchAll(/\d+/g)].map((m) => Number(m[0]));
  return nums.length ? String(Math.min(...nums)) : "NULL";
}

const valores = [];
for (const linha of linhas.slice(1)) {
  const r = linha.split(";");
  if (r.length !== cols.length) throw new Error(`linha malformada: ${r[0]}`);

  const estado = (r[I.estado] || "por triar").trim();
  if (!ESTADOS.has(estado)) throw new Error(`${r[I.id]}: estado inválido "${estado}"`);
  const confianca = (r[I.confianca] || "média").trim();
  if (!CONFIANCAS.has(confianca)) {
    throw new Error(`${r[I.id]}: confiança inválida "${confianca}"`);
  }
  const pot = txt(r[I.potencial]);
  if (pot && !["A", "B", "C"].includes(pot)) {
    throw new Error(`${r[I.id]}: potencial inválido "${pot}"`);
  }
  const dif = txt(r[I.dif]);
  if (dif && !["1", "2", "3", "4", "5"].includes(dif)) {
    throw new Error(`${r[I.id]}: dificuldade inválida "${dif}"`);
  }

  valores.push(`  (${[
    q(r[I.id]), q(r[I.nome]), q(r[I.codigo]), q(r[I.rede]),
    q(r[I.concelho]), q(r[I.distrito]), q(r[I.regiao]), q(r[I.area]),
    numero(r[I.km]), q(r[I.tipo]), q(r[I.desnivel]), q(r[I.duracao]),
    dif ?? "NULL", q(r[I.tema]), q(r[I.epoca]),
    q(r[I.autoriz]), inteiro(r[I.limite]), inteiro(r[I.viagem]),
    pot ? `'${pot}'` : "NULL",
    `'${estado}'`, q(r[I.avisos]), `'${confianca}'`, q(r[I.fonte]),
  ].join(", ")})`);
}

const sql = `-- ============================================================================
-- Outpost — Seed da biblioteca de trilhos (GERADO, não editar à mão)
-- ============================================================================
-- Gerado por backoffice/scripts/build-trail-library-seed.mjs a partir de
-- estrategia/adventures/biblioteca-trilhos/trilhos.csv.
--
-- Correr DEPOIS de 39_trail_library.sql. Pode correr-se as vezes que forem
-- precisas: faz UPSERT por ref e preserva o trabalho de triagem feito em
-- Outpost (dificuldade, tema, potencial, estado e notas só são escritos
-- quando a linha ainda não os tem).
--
-- ${valores.length} trilhos.
-- ============================================================================

INSERT INTO public.trail_library (
  ref, nome, codigo, rede, concelho, distrito, regiao, area_protegida,
  distancia_km, tipo, desnivel, duracao, dificuldade, tema, epoca,
  autorizacao, limite_grupo, viagem_leiria_min, potencial, estado,
  avisos, confianca, fonte
) VALUES
${valores.join(",\n")}
ON CONFLICT (ref) DO UPDATE SET
  -- Vem da fonte: actualiza sempre.
  nome              = EXCLUDED.nome,
  codigo            = EXCLUDED.codigo,
  rede              = EXCLUDED.rede,
  concelho          = EXCLUDED.concelho,
  distrito          = EXCLUDED.distrito,
  regiao            = EXCLUDED.regiao,
  area_protegida    = EXCLUDED.area_protegida,
  distancia_km      = EXCLUDED.distancia_km,
  tipo              = EXCLUDED.tipo,
  desnivel          = EXCLUDED.desnivel,
  duracao           = EXCLUDED.duracao,
  autorizacao       = EXCLUDED.autorizacao,
  limite_grupo      = EXCLUDED.limite_grupo,
  viagem_leiria_min = EXCLUDED.viagem_leiria_min,
  avisos            = EXCLUDED.avisos,
  confianca         = EXCLUDED.confianca,
  fonte             = EXCLUDED.fonte,
  -- Triagem feita em Outpost: só preenche se ainda estiver vazio.
  dificuldade       = COALESCE(public.trail_library.dificuldade, EXCLUDED.dificuldade),
  tema              = COALESCE(public.trail_library.tema, EXCLUDED.tema),
  potencial         = COALESCE(public.trail_library.potencial, EXCLUDED.potencial),
  estado            = CASE
                        WHEN public.trail_library.estado = 'por triar'
                        THEN EXCLUDED.estado
                        ELSE public.trail_library.estado
                      END,
  updated_at        = now();

-- ============================================================================
-- Feito. Verificar (esperado: ${valores.length} linhas):
--   SELECT regiao, estado, count(*) FROM public.trail_library
--     GROUP BY 1,2 ORDER BY 1,2;
-- ============================================================================
`;

writeFileSync(OUT, sql, "utf-8");
console.log(`${valores.length} trilhos -> ${OUT}`);
