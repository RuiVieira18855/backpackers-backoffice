-- ============================================================================
-- CRÍTICO — Fechar leitura cross-tenant de tabelas do backoffice
-- ============================================================================
-- Várias tabelas do backoffice têm `FOR SELECT TO authenticated USING (true)`,
-- assumindo que "authenticated = equipa interna". Mas o Cairn partilha o mesmo
-- projeto Supabase, e os seus clientes autenticam-se aqui (role='member',
-- kind='customer', pillar_access='{}'). Com USING(true), um cliente do Cairn
-- podia ler diretamente (PostgREST) tabelas internas: deals, time_entries,
-- workflows, webhooks (configs sensíveis), rascunhos de blog/site, etc.
--
-- As tabelas com scoping por pillar_access (contacts, events, projects, tasks,
-- documents) já estão seguras (um cliente tem pillar_access vazio). Só as de
-- USING(true) vazam. Aqui trocamos USING(true) por is_internal(auth.uid()).
--
-- Não afeta: o backend do Outpost (service_role bypassa RLS); a equipa interna
-- (kind='internal' passa); o público (as policies anon de leitura pública são
-- separadas e ficam intactas); o app do Cairn (não lê nenhuma destas tabelas).
--
-- Correr no SQL editor do Supabase. Idempotente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_internal(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND kind = 'internal'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_internal(uuid) TO authenticated;

-- Restringir cada leitura "aberta a qualquer autenticado" para só interno.
DROP POLICY IF EXISTS deals_select ON public.deals;
CREATE POLICY deals_select ON public.deals
  FOR SELECT TO authenticated USING (public.is_internal(auth.uid()));

DROP POLICY IF EXISTS templates_select ON public.templates;
CREATE POLICY templates_select ON public.templates
  FOR SELECT TO authenticated USING (public.is_internal(auth.uid()));

DROP POLICY IF EXISTS custom_field_defs_select ON public.custom_field_defs;
CREATE POLICY custom_field_defs_select ON public.custom_field_defs
  FOR SELECT TO authenticated USING (public.is_internal(auth.uid()));

DROP POLICY IF EXISTS apps_select ON public.apps;
CREATE POLICY apps_select ON public.apps
  FOR SELECT TO authenticated USING (public.is_internal(auth.uid()));

DROP POLICY IF EXISTS time_entries_select ON public.time_entries;
CREATE POLICY time_entries_select ON public.time_entries
  FOR SELECT TO authenticated USING (public.is_internal(auth.uid()));

DROP POLICY IF EXISTS workflows_select ON public.workflows;
CREATE POLICY workflows_select ON public.workflows
  FOR SELECT TO authenticated USING (public.is_internal(auth.uid()));

DROP POLICY IF EXISTS webhooks_select ON public.webhooks;
CREATE POLICY webhooks_select ON public.webhooks
  FOR SELECT TO authenticated USING (public.is_internal(auth.uid()));

DROP POLICY IF EXISTS catalog_activities_read_all ON public.catalog_activities;
CREATE POLICY catalog_activities_read_all ON public.catalog_activities
  FOR SELECT TO authenticated USING (public.is_internal(auth.uid()));

DROP POLICY IF EXISTS trail_questions_read_all ON public.trail_questions;
CREATE POLICY trail_questions_read_all ON public.trail_questions
  FOR SELECT TO authenticated USING (public.is_internal(auth.uid()));

DROP POLICY IF EXISTS blog_posts_read_all_auth ON public.blog_posts;
CREATE POLICY blog_posts_read_all_auth ON public.blog_posts
  FOR SELECT TO authenticated USING (public.is_internal(auth.uid()));

DROP POLICY IF EXISTS site_events_read_all_auth ON public.site_events;
CREATE POLICY site_events_read_all_auth ON public.site_events
  FOR SELECT TO authenticated USING (public.is_internal(auth.uid()));

DROP POLICY IF EXISTS trail_library_read_auth ON public.trail_library;
CREATE POLICY trail_library_read_auth ON public.trail_library
  FOR SELECT TO authenticated USING (public.is_internal(auth.uid()));

DROP POLICY IF EXISTS pillars_select_authenticated ON public.pillars;
CREATE POLICY pillars_select_authenticated ON public.pillars
  FOR SELECT TO authenticated USING (public.is_internal(auth.uid()));

-- ============================================================================
-- Verificar (como cliente do Cairn, kind='customer'):
--   select count(*) from deals;  -> deve dar 0 (RLS bloqueia)
-- Como interno (kind='internal'): continua a ver tudo.
-- Confirmar também que a app do Cairn e o Outpost continuam a funcionar.
-- ============================================================================
