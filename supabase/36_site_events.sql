-- ============================================================================
-- Outpost — Site events (caminhadas e eventos públicos, autorados em Outpost)
-- ============================================================================
-- O site público (web) lê hoje ficheiros JSON de disco em
-- web/src/content/events. Esta tabela move essa agenda para a base de dados,
-- para poder ser criada, editada e arquivada em Outpost sem deploy.
--
-- NOTA sobre o nome: public.events já existe e é o calendário INTERNO de ops
-- (com recorrência, participantes, ligação a projectos). Esta tabela é a
-- agenda PÚBLICA do site e é deliberadamente separada — daí site_events.
--
-- Modelo de estados:
--   - draft     : só visível em Outpost.
--   - published : aparece na agenda, no mapa e na página de detalhe.
--   - archived  : sai da agenda e do mapa, mas /eventos/[slug] continua vivo
--                 (mantém SEO, links partilhados e galeria de edições passadas).
--
-- Acesso:
--   - anon (site público, anon key): lê published + archived.
--   - authenticated (backoffice): lê tudo, rascunhos incluídos.
--   - super_user + admin_grupo: cria / edita / apaga.
-- O servidor Outpost escreve pela ligação Drizzle (service role, ignora RLS),
-- por isso estas políticas são defesa em profundidade para acesso REST/anon.
--
-- Correr UMA VEZ no Supabase SQL Editor. Idempotente.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.site_event_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.site_event_type AS ENUM (
    'adventure', 'synergy-open', 'workshop', 'retreat'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.site_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text NOT NULL,
  title             text NOT NULL,
  summary           text NOT NULL DEFAULT '',
  description       text NOT NULL DEFAULT '',

  -- Data: starts_at NULL = "a confirmar" (TBC). Nesse caso planned_month
  -- ("YYYY-MM") é o que o site mostra como "Outubro 2026 · a confirmar".
  starts_at         timestamptz,
  ends_at           timestamptz,
  planned_month     text,

  type              public.site_event_type NOT NULL DEFAULT 'adventure',
  location          text NOT NULL DEFAULT '',
  -- Código de região reconhecido pelo site (REGIONS em web/src/types/event.ts).
  -- Texto livre de propósito: acrescentar uma região nova não exige migração.
  region            text,
  lat               double precision,
  lng               double precision,
  meeting_point     text,
  distance          text,
  difficulty        smallint CHECK (difficulty BETWEEN 1 AND 5),
  price             integer NOT NULL DEFAULT 0,
  max_participants  integer NOT NULL DEFAULT 0,

  cover_image       text,
  images            text[] NOT NULL DEFAULT '{}',
  included          text[] NOT NULL DEFAULT '{}',
  requirements      text[] NOT NULL DEFAULT '{}',
  featured          boolean NOT NULL DEFAULT false,

  status            public.site_event_status NOT NULL DEFAULT 'draft',
  published_at      timestamptz,
  archived_at       timestamptz,

  created_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS site_events_slug_idx
  ON public.site_events (slug);
CREATE INDEX IF NOT EXISTS site_events_status_starts_idx
  ON public.site_events (status, starts_at);
CREATE INDEX IF NOT EXISTS site_events_type_idx
  ON public.site_events (type);

ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;

-- Privilégios de tabela (RLS continua a filtrar linhas).
GRANT SELECT ON public.site_events TO anon, authenticated;

DROP POLICY IF EXISTS site_events_read_live_anon ON public.site_events;
DROP POLICY IF EXISTS site_events_read_all_auth ON public.site_events;
DROP POLICY IF EXISTS site_events_write_super_or_admin_grupo ON public.site_events;

-- O site lê publicados e arquivados. Arquivados nunca aparecem na agenda
-- (é o web que os filtra), mas a página de detalhe tem de continuar a abrir.
CREATE POLICY site_events_read_live_anon ON public.site_events
  FOR SELECT TO anon
  USING (status IN ('published', 'archived'));

-- Backoffice lê tudo, rascunhos incluídos.
CREATE POLICY site_events_read_all_auth ON public.site_events
  FOR SELECT TO authenticated
  USING (true);

-- Só super_user + admin_grupo criam / editam / apagam.
CREATE POLICY site_events_write_super_or_admin_grupo ON public.site_events
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
--   SELECT slug, title, type, status, starts_at, planned_month
--     FROM public.site_events ORDER BY starts_at NULLS LAST;
-- ============================================================================
