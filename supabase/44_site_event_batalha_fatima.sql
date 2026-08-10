-- ============================================================================
-- Outpost — Caminhada do Regresso: Batalha a Fátima
-- ============================================================================
-- A caminhada que reabre a operação Adventures. Gratuita na primeira edição,
-- com intenção de repetir de dois em dois meses.
--
-- Correr no Supabase SQL Editor DEPOIS de 36_site_events.sql.
-- Pode correr-se as vezes que forem precisas: ON CONFLICT (slug) actualiza o
-- conteúdo mas NÃO mexe no estado nem na data, para não desfazer o que se
-- ajustar em Outpost depois.
--
-- ENTRA COMO RASCUNHO (draft), de propósito. O traçado ainda não foi
-- reconhecido, e um evento publicado com uma hora de chegada inventada é uma
-- promessa que não se pode cumprir. Publicar em Outpost depois do
-- reconhecimento, ou correndo a última linha comentada no fim deste ficheiro.
-- ============================================================================

INSERT INTO public.site_events (
  slug, title, summary, description,
  starts_at, ends_at, planned_month,
  type, location, region, lat, lng,
  meeting_point, distance, difficulty, price, max_participants,
  cover_image, images, included, requirements, featured,
  status
)
SELECT
  v.slug, v.title, v.summary, v.description,
  v.starts_at::timestamptz, v.ends_at::timestamptz, v.planned_month,
  v.type::public.site_event_type, v.location, v.region,
  v.lat::double precision, v.lng::double precision,
  v.meeting_point, v.distance, v.difficulty::smallint,
  v.price::integer, v.max_participants::integer,
  v.cover_image, v.images::text[], v.included::text[], v.requirements::text[],
  v.featured, 'draft'
FROM (VALUES
  (
    'caminhada-batalha-fatima',
    'Caminhada do Regresso · Batalha a Fátima',
    'De mosteiro a santuário, 24 km a pé. A primeira caminhada do nosso regresso, e é gratuita.',
    'Há dois sítios no distrito que toda a gente conhece e que quase ninguém ligou a pé. O Mosteiro da Batalha, que se construiu para agradecer uma batalha ganha. E o Santuário de Fátima, para onde meio mundo caminha todos os anos. Estão a 24 quilómetros um do outro e no meio há a serra.

Esta é a caminhada com que reabrimos as Backpackers Adventures. Não tem preço, não tem inscrição paga e não tem discurso de vendas no fim. Tem 24 quilómetros, uma subida séria do vale para o planalto de Santo António, e um grupo de pessoas a andar na mesma direcção.

**O caminho.** Saímos do Mosteiro da Batalha ao nascer do dia, subimos ao planalto pelo Reguengo do Fetal e atravessamos o Parque Natural das Serras de Aire e Candeeiros até à Cova da Iria. Não é um caminho sinalizado: é um traçado nosso, reconhecido a pé antes de o abrirmos ao grupo.

**Metade do caminho também conta.** Quem não faz 24 km encontra-se connosco no Reguengo do Fetal, sensivelmente a meio, e caminha os últimos 12. É a mesma chegada e a mesma mesa no fim.

**Porque é que é grátis.** Porque queremos que a primeira seja cheia. Vamos repetir esta caminhada de dois em dois meses, e as próximas terão um preço normal. Esta é para reabrir a porta.',
    NULL,
    NULL,
    '2026-09',
    'adventure',
    'Batalha a Fátima',
    'fatima',
    39.6595,
    -8.8256,
    'Mosteiro da Batalha, junto à estátua de Nuno Álvares Pereira. Segundo ponto de encontro no Reguengo do Fetal para quem faz meia distância. Transporte de regresso a Fátima combinado com quem se inscrever.',
    '24 km (ou 12 km a partir do Reguengo do Fetal)',
    3,
    0,
    30,
    NULL,
    ARRAY[]::text[],
    ARRAY[
      'Acompanhamento por guia da Backpackers do início ao fim',
      'Traçado reconhecido a pé antes da caminhada',
      'Ponto de apoio a meio com água e fruta',
      'Seguro de acidente pessoal',
      'Boleia de regresso ao ponto de partida'
    ],
    ARRAY[
      'Calçado de caminhada já rodado, nada de estrear neste dia',
      'Dois litros de água por pessoa',
      'Chapéu e protector solar: há troços longos sem sombra',
      'Almoço leve para comer em rota',
      'Ritmo de grupo: quem chega primeiro espera'
    ],
    true
  )
) AS v (
  slug, title, summary, description,
  starts_at, ends_at, planned_month,
  type, location, region, lat, lng,
  meeting_point, distance, difficulty, price, max_participants,
  cover_image, images, included, requirements, featured
)
ON CONFLICT (slug) DO UPDATE SET
  -- Conteúdo: actualiza sempre, para se poder reescrever a copy aqui.
  title            = EXCLUDED.title,
  summary          = EXCLUDED.summary,
  description      = EXCLUDED.description,
  location         = EXCLUDED.location,
  region           = EXCLUDED.region,
  lat              = EXCLUDED.lat,
  lng              = EXCLUDED.lng,
  meeting_point    = EXCLUDED.meeting_point,
  distance         = EXCLUDED.distance,
  difficulty       = EXCLUDED.difficulty,
  included         = EXCLUDED.included,
  requirements     = EXCLUDED.requirements,
  -- Estado, data e preço: NÃO se tocam. Quem os define é o Outpost, e correr
  -- este ficheiro outra vez não pode despublicar um evento já anunciado nem
  -- repor uma data que entretanto foi marcada.
  updated_at       = now();

-- ============================================================================
-- Depois do reconhecimento, marcar a data e publicar:
--
--   UPDATE public.site_events SET
--     starts_at    = '2026-09-26 07:00:00+01',
--     ends_at      = '2026-09-26 15:00:00+01',
--     planned_month= NULL,
--     status       = 'published',
--     published_at = now()
--   WHERE slug = 'caminhada-batalha-fatima';
--
-- Verificar:
--   SELECT slug, status, starts_at, planned_month, price
--     FROM public.site_events WHERE slug = 'caminhada-batalha-fatima';
-- ============================================================================
