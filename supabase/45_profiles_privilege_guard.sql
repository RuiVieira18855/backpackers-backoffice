-- ============================================================================
-- CRÍTICO — Impedir auto-escalonamento de privilégios via profiles
-- ============================================================================
-- A policy `profiles_update_own` (bootstrap) permite a um utilizador autenticado
-- fazer UPDATE ao SEU próprio registo com WITH CHECK (auth.uid() = id), SEM
-- restringir colunas. Como o Cairn partilha o mesmo projeto Supabase que o
-- Outpost, QUALQUER conta autenticada (incluindo um cliente grátis do Cairn)
-- podia fazer:
--
--     update profiles set role = 'super_user' where id = <o_seu_id>;
--
-- ...e tornar-se super_user de TODO o backoffice (CRM, finanças, pilares, docs),
-- além de desbloquear o Cairn Pro. Take-over completo a partir de uma conta
-- grátis.
--
-- Este trigger bloqueia a alteração das colunas de privilégio
-- (role, kind, skills, pillar_access, disabled_at) por quem não é admin.
-- Preserva: self-edit de campos não sensíveis (full_name, avatar_url,
-- default_pillar_id); alterações por admins na app; e alterações pelo backend
-- (service_role) e migrações (postgres).
--
-- Correr no SQL editor do Supabase. Idempotente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.profiles_guard_privileged()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Backend (service_role) e administração da BD (postgres/supabase_admin)
  -- gerem papéis de forma legítima. session_user reflete a role da ligação e
  -- não é alterado por SECURITY DEFINER.
  IF session_user IN ('service_role', 'postgres', 'supabase_admin', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  -- Admins/super da app podem mudar campos de privilégio; mais ninguém.
  IF public.is_admin_or_above(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.role          IS DISTINCT FROM OLD.role
     OR NEW.kind       IS DISTINCT FROM OLD.kind
     OR NEW.skills     IS DISTINCT FROM OLD.skills
     OR NEW.pillar_access IS DISTINCT FROM OLD.pillar_access
     OR NEW.disabled_at   IS DISTINCT FROM OLD.disabled_at THEN
    RAISE EXCEPTION 'Not allowed: role/kind/skills/pillar_access/disabled_at are privileged and cannot be changed by this account.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_privileged ON public.profiles;
CREATE TRIGGER profiles_guard_privileged
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_privileged();

-- Defesa extra: garantir que anon nunca escreve em profiles.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;

-- ============================================================================
-- Verificar (como um utilizador NÃO admin, ex. via app):
--   update profiles set role='super_user' where id = auth.uid();
--   -> deve falhar com a exceção acima.
--   update profiles set full_name='Novo Nome' where id = auth.uid();
--   -> deve funcionar.
-- ============================================================================
