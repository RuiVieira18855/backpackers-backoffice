-- ============================================================================
-- Outpost — Labs Pass (uma subscrição, todas as tools)
-- ============================================================================
-- O Labs Pass é a cola comercial da família de tools (ver
-- estrategia/labs/familia-tools-cairn.md): uma subscrição que desbloqueia o
-- Pro em todas as tools do Backpackers Labs, em vez de uma subscrição por
-- produto.
--
-- Desenho: o passe NÃO é uma coluna nova nem uma tabela nova. É uma linha
-- normal em app_access com app = 'labs-pass', e a função has_app_access()
-- passa a aceitá-la como prova de acesso a qualquer app marcada como
-- pertencente ao passe. Consequência prática: nenhuma app precisa de mudar
-- código para respeitar o passe, porque todas já chamam esta função (Cairn
-- fá-lo no AccessGate e no proxy de IA).
--
-- Ordem de precedência do acesso:
--   1. super_user            -> tudo, sempre (regra do 17_).
--   2. grant directo         -> app_access.app = <app>.
--   3. Labs Pass             -> app_access.app = 'labs-pass' E a app está no passe.
--
-- Uma app pode ser deixada de fora do passe (apps.in_labs_pass = false), por
-- exemplo se um dia houver uma tool vendida à parte ou um piloto de cliente.
--
-- Idempotente. Correr depois de 15_apps_multi.sql e 17_super_user_universal_access.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Que apps é que o passe cobre
-- ---------------------------------------------------------------------------

ALTER TABLE public.apps
  ADD COLUMN IF NOT EXISTS in_labs_pass boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.apps.in_labs_pass IS
  'true = esta app é desbloqueada por um Labs Pass activo. false = vende-se só à parte.';

-- O passe entra no catálogo para aparecer no Outpost como qualquer outra
-- coisa que se concede, mas não se desbloqueia a si próprio.
INSERT INTO public.apps (key, name, description, icon, in_labs_pass)
VALUES (
  'labs-pass',
  'Labs Pass',
  'Subscrição única que desbloqueia o Pro em todas as tools do Backpackers Labs.',
  'KeyRound',
  false
)
ON CONFLICT (key) DO UPDATE
  SET in_labs_pass = false,
      description  = EXCLUDED.description,
      updated_at   = now();

-- Garante que o Cairn está no catálogo e dentro do passe (o 15_ já o semeia,
-- isto só fixa a coluna nova para instalações que já existiam).
UPDATE public.apps SET in_labs_pass = true WHERE key = 'cairn';


-- ---------------------------------------------------------------------------
-- 2. has_app_access(), agora com o passe
-- ---------------------------------------------------------------------------
-- Substitui a versão do 17_. Mantém a assinatura e o comportamento anterior:
-- quem tinha acesso antes continua a ter, o passe só acrescenta um caminho.

CREATE OR REPLACE FUNCTION public.has_app_access(uid uuid, app_key text DEFAULT 'cairn')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- 1. Super users: tudo, sempre, de graça.
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = uid AND role = 'super_user'
    )
    OR
    -- 2. Grant directo a esta app.
    EXISTS (
      SELECT 1 FROM public.app_access
      WHERE user_id = uid
        AND app = app_key
        AND status IN ('trial', 'active')
        AND (expires_at IS NULL OR expires_at > now())
    )
    OR
    -- 3. Labs Pass activo E esta app faz parte do passe.
    --    A app tem de existir no catálogo: uma chave desconhecida nunca é
    --    desbloqueada por engano.
    (
      EXISTS (
        SELECT 1 FROM public.app_access
        WHERE user_id = uid
          AND app = 'labs-pass'
          AND status IN ('trial', 'active')
          AND (expires_at IS NULL OR expires_at > now())
      )
      AND EXISTS (
        SELECT 1 FROM public.apps
        WHERE key = app_key
          AND is_active
          AND in_labs_pass
      )
    );
$$;


-- ---------------------------------------------------------------------------
-- 3. my_apps(): o que este utilizador pode abrir
-- ---------------------------------------------------------------------------
-- Alimenta o selector de apps do shell partilhado. Devolve só o que a pessoa
-- pode mesmo abrir, e diz por que via, para a interface poder explicar-se
-- ("incluído no teu Labs Pass").

CREATE OR REPLACE FUNCTION public.my_apps()
RETURNS TABLE (
  key         text,
  name        text,
  description text,
  icon        text,
  url         text,
  color       text,
  source      text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.key, a.name, a.description, a.icon, a.url, a.color,
    CASE
      WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'super_user')
        THEN 'super'
      WHEN EXISTS (
        SELECT 1 FROM public.app_access x
        WHERE x.user_id = auth.uid() AND x.app = a.key
          AND x.status IN ('trial', 'active')
          AND (x.expires_at IS NULL OR x.expires_at > now())
      ) THEN 'direct'
      ELSE 'pass'
    END AS source
  FROM public.apps a
  WHERE a.is_active
    AND a.key <> 'labs-pass'                 -- o passe não é uma tool
    AND public.has_app_access(auth.uid(), a.key)
  ORDER BY a.name;
$$;

GRANT EXECUTE ON FUNCTION public.my_apps() TO authenticated;


-- ---------------------------------------------------------------------------
-- 4. has_labs_pass(): para o upsell
-- ---------------------------------------------------------------------------
-- Uma tool que não tem grant directo quer saber se deve mostrar "compra o
-- passe" ou "já tens o passe, isto é um problema de configuração".

CREATE OR REPLACE FUNCTION public.has_labs_pass(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = uid AND role = 'super_user'
  ) OR EXISTS (
    SELECT 1 FROM public.app_access
    WHERE user_id = uid
      AND app = 'labs-pass'
      AND status IN ('trial', 'active')
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_labs_pass(uuid) TO authenticated;


-- ============================================================================
-- Feito. Verificar:
--
--   -- que apps estão no passe
--   SELECT key, name, is_active, in_labs_pass FROM public.apps ORDER BY key;
--
--   -- conceder um passe à mão (o webhook do Stripe faz isto sozinho)
--   INSERT INTO public.app_access (user_id, app, status, plan, notes)
--   VALUES ('<user_id>', 'labs-pass', 'active', 'manual', 'concedido à mão')
--   ON CONFLICT (user_id, app) DO UPDATE SET status = 'active';
--
--   -- essa pessoa passa a entrar no Cairn sem grant de Cairn
--   SELECT public.has_app_access('<user_id>', 'cairn');   -- true
--
--   -- e o selector de apps mostra-lhe o catálogo (correr autenticado)
--   SELECT * FROM public.my_apps();
-- ============================================================================
