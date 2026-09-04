-- ============================================================================
-- Cairn — Realtime Authorization (fecha o C-01 do security assessment)
-- ============================================================================
-- Os canais de colaboração do Cairn (doc:<id> para presença/cursores,
-- docsync:<id> para snapshots/ops) eram PÚBLICOS: um cliente anónimo com a
-- anon key podia juntar-se a qualquer tópico e, se soubesse o UUID do
-- documento, pedir um snapshot ou injetar edições.
--
-- Agora o cliente junta-se com `private: true`, o que faz o Supabase verificar
-- RLS na tabela realtime.messages. Estas políticas só deixam o DONO do
-- documento entrar no tópico correspondente. Falha fechado: sem estas
-- políticas, ninguém entra (seguro, mas presença/cursores param até correr).
--
-- Correr no SQL editor do Supabase. Idempotente.
-- ============================================================================

-- Quem pode aceder ao tópico de um documento? Só o dono, por agora.
-- (Quando existir partilha de edição/membros, acrescentar aqui.)
CREATE OR REPLACE FUNCTION public.cairn_can_access_doc_topic(topic text, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN uid IS NULL THEN false
    WHEN topic LIKE 'doc:%' OR topic LIKE 'docsync:%' THEN EXISTS (
      SELECT 1 FROM public.cairn_documents d
      WHERE d.id::text = split_part(topic, ':', 2)
        AND d.user_id = uid
    )
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public.cairn_can_access_doc_topic(text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cairn_can_access_doc_topic(text, uuid) TO authenticated;

-- NOTA: NÃO fazer `ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY`.
-- Essa tabela é gerida pelo Supabase (não somos donos, daria
-- "42501: must be owner of table messages") e o RLS já vem ativo com a
-- Realtime Authorization. Basta criar as políticas abaixo.

-- Ler (receber presença/broadcast) num tópico de documento: só o dono.
DROP POLICY IF EXISTS "cairn doc topic read" ON realtime.messages;
CREATE POLICY "cairn doc topic read"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (public.cairn_can_access_doc_topic(realtime.topic(), auth.uid()));

-- Escrever (enviar broadcast/track presença) num tópico de documento: só o dono.
DROP POLICY IF EXISTS "cairn doc topic write" ON realtime.messages;
CREATE POLICY "cairn doc topic write"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.cairn_can_access_doc_topic(realtime.topic(), auth.uid()));

-- ============================================================================
-- Verificar:
--   -- deve devolver false (tópico inexistente / não-dono):
--   SELECT public.cairn_can_access_doc_topic('docsync:00000000-0000-0000-0000-000000000000', auth.uid());
-- Depois: abrir um doc cloud na app (autenticado) e confirmar que presença
-- e cursores voltam a funcionar; um cliente anónimo já não consegue juntar-se.
-- ============================================================================
