-- ============================================================================
-- Outpost — Tirar as fotografias genéricas das caminhadas
-- ============================================================================
-- Sete das oito caminhadas partilhavam a mesma fotografia de banco
-- (/images/hero/adventures-autumn.jpg) e a oitava usava uma imagem do pilar
-- Synergy. Nenhuma mostrava o trilho que a página vende.
--
-- Pôr a capa a NULL faz o site desenhar o mapa topográfico gerado a partir do
-- slug (web/src/components/trail-hero.tsx), que é honesto: não finge ser uma
-- fotografia do local. Assim que houver foto do terreno, carrega-se em Outpost
-- e ela passa a mandar.
--
-- Os três workshops mantêm as fotografias de facilitação, que mostram
-- efectivamente o que é vendido. O retiro de Santiago mantém a foto de grupo.
--
-- Correr no Supabase SQL Editor. Seguro de repetir.
-- ============================================================================

-- Parte A: capas. Só as caminhadas (type = 'adventure').
UPDATE public.site_events
SET cover_image = NULL,
    updated_at = now()
WHERE type = 'adventure'
  AND cover_image IN (
    '/images/hero/adventures-autumn.jpg',
    '/images/pillars/synergy-puzzle.jpg'
  );

-- Parte B: galerias. OPCIONAL, decide antes de correr.
--
-- As galerias das mesmas oito caminhadas contêm exactamente as duas fotos
-- genéricas (adventures-autumn.jpg e trilho-inverno.jpg). Tirar a capa e
-- deixar a galeria deixa o mesmo problema mais abaixo na página: a secção
-- "Galeria" continua a mostrar um sítio que não é aquele.
--
-- Descomenta se quiseres a página coerente já. A alternativa defensável é
-- deixar como está até haver fotos nossas, porque uma galeria vazia também
-- não vende. A secção só aparece com 2 ou mais imagens, por isso esvaziar
-- faz a galeria desaparecer em vez de ficar meia.
--
-- UPDATE public.site_events
-- SET images = '{}',
--     updated_at = now()
-- WHERE type = 'adventure';

-- ============================================================================
-- Verificar:
--   SELECT slug, cover_image, coalesce(array_length(images,1),0) AS fotos
--     FROM public.site_events WHERE type = 'adventure' ORDER BY slug;
-- ============================================================================
