-- ============================================================================
-- Outpost — Biblioteca de trilhos (referência interna do pilar Adventures)
-- ============================================================================
-- Catálogo de percursos pedestres de Portugal, largo e raso, de onde saem as
-- caminhadas que vão para a agenda pública (public.site_events).
--
-- Origem: estrategia/adventures/biblioteca-trilhos/trilhos.csv, gerado por
-- build-trilhos.mjs. Uma parte vem de fonte oficial (ICNF, IFCN, Trilhos dos
-- Açores, câmaras) e outra de agregador, ainda por triar. A coluna confianca
-- diz qual é qual e NADA daqui deve ir para o site sem confirmação municipal:
-- a numeração PR muda quando um município remodela a rede.
--
-- É informação INTERNA. Ao contrário de site_events, o anon não lê nada.
--
-- Acesso:
--   - authenticated (backoffice): lê tudo.
--   - super_user + admin_grupo: cria / edita / apaga.
-- O servidor escreve por Drizzle (service connection, ignora RLS); estas
-- políticas são defesa em profundidade para acesso REST directo.
--
-- Correr UMA VEZ no Supabase SQL Editor. Idempotente.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.trail_estado AS ENUM (
    'por triar',        -- veio do agregador, ninguém olhou
    'ideia',            -- triado, interessa-nos
    'a reconhecer',     -- marcado para ir ao terreno
    'reconhecido',      -- já foi feito por nós
    'ficha operacional',-- tem ficha em estrategia/adventures/percursos
    'activo no site'    -- já deu origem a caminhadas na agenda
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.trail_confianca AS ENUM ('alta', 'média', 'baixa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.trail_library (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identificador estável vindo do CSV. É a chave da re-importação.
  ref               text NOT NULL,

  nome              text NOT NULL,
  codigo            text,
  rede              text,

  concelho          text,
  distrito          text,
  regiao            text,
  area_protegida    text,

  -- NULL quando a fonte não publica o valor. O CSV usa "[CONFIRMAR]"; aqui é
  -- NULL, para se poder ordenar e filtrar por distância sem casos especiais.
  distancia_km      numeric(6,2),
  tipo              text,
  desnivel          text,
  duracao           text,
  dificuldade       smallint CHECK (dificuldade BETWEEN 1 AND 5),
  tema              text,
  epoca             text,

  -- Viabilidade comercial: é isto que decide se um trilho dá para vender.
  autorizacao       text,
  limite_grupo      integer,
  viagem_leiria_min integer,
  potencial         text CHECK (potencial IN ('A', 'B', 'C')),

  estado            public.trail_estado NOT NULL DEFAULT 'por triar',
  avisos            text,
  confianca         public.trail_confianca NOT NULL DEFAULT 'média',
  fonte             text,
  notas             text,

  updated_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS trail_library_ref_idx
  ON public.trail_library (ref);
CREATE INDEX IF NOT EXISTS trail_library_regiao_idx
  ON public.trail_library (regiao);
CREATE INDEX IF NOT EXISTS trail_library_estado_idx
  ON public.trail_library (estado);
CREATE INDEX IF NOT EXISTS trail_library_potencial_idx
  ON public.trail_library (potencial, viagem_leiria_min);

ALTER TABLE public.trail_library ENABLE ROW LEVEL SECURITY;

-- Sem GRANT ao anon: isto não é conteúdo de site.
GRANT SELECT ON public.trail_library TO authenticated;

DROP POLICY IF EXISTS trail_library_read_auth ON public.trail_library;
DROP POLICY IF EXISTS trail_library_write_super_or_admin_grupo ON public.trail_library;

CREATE POLICY trail_library_read_auth ON public.trail_library
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY trail_library_write_super_or_admin_grupo ON public.trail_library
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_user', 'admin_grupo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_user', 'admin_grupo')
    )
  );

-- ============================================================================
-- Feito. Verificar:
--   SELECT regiao, estado, count(*) FROM public.trail_library
--     GROUP BY 1,2 ORDER BY 1,2;
-- ============================================================================
