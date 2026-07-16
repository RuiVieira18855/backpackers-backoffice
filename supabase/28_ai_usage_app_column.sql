-- ============================================================================
-- Outpost — ai_usage.app column (para o Cairn poder registar as suas gerações)
-- ============================================================================
-- O Cairn (app externa) faz insert com app='cairn' via service role. Sem esta
-- coluna, o insert falhava. Default 'outpost' preserva os registos existentes.
--
-- O Outpost passa a preencher 'outpost' automaticamente (schema tem default).
-- Idempotente.
-- ============================================================================

ALTER TABLE public.ai_usage
  ADD COLUMN IF NOT EXISTS app text NOT NULL DEFAULT 'outpost';

CREATE INDEX IF NOT EXISTS ai_usage_app_idx ON public.ai_usage (app);

-- ============================================================================
-- Verify:
--   SELECT app, count(*), sum(input_tokens + output_tokens) AS tokens
--   FROM public.ai_usage GROUP BY app;
-- ============================================================================
