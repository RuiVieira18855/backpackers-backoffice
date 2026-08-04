-- ============================================================================
-- Outpost — Coordenadas na biblioteca de trilhos
-- ============================================================================
-- Faltava o ponto de partida. Sem ele, uma caminhada criada a partir de um
-- trilho nascia sem marcador no mapa interactivo do site, e alguém tinha de
-- ir buscar as coordenadas à mão depois de o evento já existir.
--
-- O backfill copia as coordenadas dos eventos que já estão na agenda para os
-- trilhos que lhes deram origem. Cobre os que vieram dos ficheiros antigos.
-- Os restantes preenchem-se ao triar, com o campo novo no formulário.
--
-- Correr DEPOIS de 39. Idempotente.
-- ============================================================================

ALTER TABLE public.trail_library
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

COMMENT ON COLUMN public.trail_library.lat IS
  'Latitude do ponto de partida. Passa para o evento ao criar a caminhada.';
COMMENT ON COLUMN public.trail_library.lng IS
  'Longitude do ponto de partida.';

-- Backfill a partir da agenda. Só onde o trilho ainda não tem coordenadas,
-- para não sobrepor correcções feitas à mão.
UPDATE public.trail_library t
SET lat = e.lat,
    lng = e.lng,
    updated_at = now()
FROM (VALUES
  ('lra-pr4-pms-fornea',             'pr4-fornea'),
  ('lra-pr4-lra-nascente-lis',       'pr4-nascente-lis'),
  ('lra-pr2-lra-termas',             'pr2-termas-el-rei'),
  ('lra-pr1-lra-lapedo',             'trilho-menino-lapedo'),
  ('lra-fendas-fatima',              'trilho-fendas-fatima'),
  ('lra-fvn-pr1-sao-simao',          'trilho-fragas-sao-simao'),
  ('lra-passadico-fragas-sao-simao', 'trilho-fragas-sao-simao'),
  ('avr-passadicos-paiva',           'passadicos-paiva-arouca'),
  ('avr-ponte-516',                  'passadicos-paiva-arouca'),
  ('int-santiago-tui-padron',        'caminho-santiago-3-dias')
) AS m(ref, slug)
JOIN public.site_events e ON e.slug = m.slug
WHERE t.ref = m.ref
  AND t.lat IS NULL
  AND e.lat IS NOT NULL;

-- ============================================================================
-- Verificar:
--   SELECT count(*) FILTER (WHERE lat IS NOT NULL) AS com_coords,
--          count(*) AS total
--     FROM public.trail_library;
-- ============================================================================
