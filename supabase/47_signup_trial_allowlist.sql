-- ============================================================================
-- Endurecer o trial auto-concedido no signup
-- ============================================================================
-- handle_new_user() dava um trial de QUALQUER app do catálogo se o cliente
-- passasse app_key nos metadados do signup — incluindo o Labs Pass (que
-- desbloqueia todas as tools). Passa a exigir uma flag explícita por app:
-- apps.self_signup_trial. Só as apps marcadas permitem auto-trial no registo.
--
-- Correr no SQL editor do Supabase. Idempotente. (Depois de 32.)
-- ============================================================================

ALTER TABLE public.apps
  ADD COLUMN IF NOT EXISTS self_signup_trial boolean NOT NULL DEFAULT false;

-- Só o Cairn permite trial no auto-registo (a porta de entrada externa).
-- Marcar aqui outras apps SE e QUANDO se quiser abri-las ao auto-trial.
UPDATE public.apps SET self_signup_trial = true  WHERE key = 'cairn';
UPDATE public.apps SET self_signup_trial = false WHERE key = 'labs-pass';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_app_key text := nullif(NEW.raw_user_meta_data ->> 'app_key', '');
BEGIN
  -- Least privilege ALWAYS. Never trust client metadata for kind/role/skills.
  INSERT INTO public.profiles (id, email, full_name, role, kind, skills)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NULL
    ),
    'member'::public.user_role,
    'customer'::public.user_kind,
    '{}'::text[]
  );

  -- Trial opcional, e SÓ para apps explicitamente abertas ao auto-registo
  -- (apps.self_signup_trial = true). Bloqueia auto-trial de labs-pass, etc.
  IF meta_app_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.apps
      WHERE key = meta_app_key AND self_signup_trial
    ) THEN
      INSERT INTO public.app_access (user_id, app, status, plan, notes)
      VALUES (NEW.id, meta_app_key, 'trial', 'self-signup', 'auto-granted at signup')
      ON CONFLICT (user_id, app) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Verificar:
--   SELECT key, self_signup_trial FROM public.apps ORDER BY key;
--   -- só 'cairn' deve estar TRUE (a menos que abras outra de propósito).
-- ============================================================================
