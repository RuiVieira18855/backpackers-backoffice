-- ============================================================================
-- Outpost — Seed das caminhadas (GERADO, não editar à mão)
-- ============================================================================
-- Gerado por backoffice/scripts/build-site-events-seed.mjs a partir dos
-- ficheiros que o site tinha em web/src/content/events/*.json.
--
-- Correr UMA VEZ no Supabase SQL Editor, DEPOIS de 36_site_events.sql.
-- Entram já como publicados, que é como estavam no site. ON CONFLICT DO
-- NOTHING: correr outra vez não apaga o que entretanto editaste em Outpost.
-- ============================================================================

INSERT INTO public.site_events (
  slug, title, summary, description,
  starts_at, ends_at, planned_month,
  type, location, region, lat, lng,
  meeting_point, distance, difficulty, price, max_participants,
  cover_image, images, included, requirements, featured,
  status, published_at
)
-- Os casts são precisos: numa coluna do VALUES em que todas as linhas são
-- NULL, o Postgres infere text e recusa a inserção na coluna tipada.
SELECT
  v.slug, v.title, v.summary, v.description,
  v.starts_at::timestamptz, v.ends_at::timestamptz, v.planned_month,
  v.type, v.location, v.region,
  v.lat::double precision, v.lng::double precision,
  v.meeting_point, v.distance, v.difficulty::smallint,
  v.price::integer, v.max_participants::integer,
  v.cover_image, v.images::text[], v.included::text[], v.requirements::text[],
  v.featured,
  'published', now()
FROM (VALUES
  (
    'caminho-santiago-3-dias',
    'Caminho de Santiago · 3 dias (Tui a Padrón)',
    '3 etapas do Caminho Português com grupo pequeno. Cerca de 75 km divididos por 3 dias.',
    'Uma micro-expedição pelo Caminho de Santiago Português, seguindo o trajecto entre Tui e Padrón em três etapas. Formato pensado para quem quer viver a experiência mas não tem duas semanas livres.

Dia 1 (Tui a O Porriño, ~18 km): pontas suaves, rios, floresta. Dia 2 (O Porriño a Redondela, ~14 km): a etapa mais rural, aldeias autênticas, subida ao Chan das Pipas. Dia 3 (Redondela a Padrón, ~40 km em 2 dias): entrada em vinhas, ambiente galego.

Dormidas em albergues cuidadosamente escolhidos, refeições incluídas, transporte de bagagem entre etapas. Grupo pequeno, ritmo próprio, sem pressa de credencial.',
    NULL,
    NULL,
    '2026-10',
    'retreat'::public.site_event_type,
    'Tui a Padrón (Galiza)',
    'santiago',
    42.049,
    -8.644,
    'Estação de Tui, sexta-feira 9h. Transporte partilhado desde Leiria se necessário.',
    '~75 km em 3 etapas',
    4,
    380,
    12,
    '/images/events/team-outdoor.jpg',
    ARRAY['/images/events/team-outdoor.jpg', '/images/hero/adventures-autumn.jpg', '/images/events/team-close.jpg'],
    ARRAY['Guia experiente da Backpackers durante 3 dias', '2 noites em albergue seleccionado', 'Todas as refeições (pequeno-almoço, almoço em rota, jantar em grupo)', 'Transporte de bagagem entre etapas', 'Credencial do Peregrino', 'Seguro de acidente pessoal + responsabilidade civil', 'Relatório fotográfico final'],
    ARRAY['Botas de trilho já rodadas (não estreies em Santiago)', 'Mochila pequena para o dia (30-40L)', 'Sacos para bagagem principal (transportamos)', 'Roupa em camadas para todos os cenários', 'Boa disposição para caminhar em grupo'],
    true
  ),
  (
    'family-day-segredos-pedras',
    'Family Day · Segredos das pedras',
    'Meio-dia de trilho fácil na Serra de Aire com actividades pensadas para crianças e adultos.',
    'Um formato especial que fazemos algumas vezes por ano: trilho curto (4 km, quase plano) combinado com oficina temática pensada para famílias com crianças entre os 6 e os 12 anos.

Desta vez o tema é ''os segredos das pedras'': aprendemos a identificar rochas, folhas e pequenos animais ao longo do caminho. Cada família recebe um caderno-guia para levar para casa.

O ritmo é o das crianças, com muitas paragens. Adultos vêm por curiosidade genuína, não por obrigação. É o formato mais escolhido por avós que trazem netos.',
    NULL,
    NULL,
    '2026-10',
    'adventure'::public.site_event_type,
    'Serra de Aire, Alvados',
    'aire-candeeiros',
    39.5417,
    -8.7789,
    'Centro de Interpretação Ambiental de Alvados',
    '4 km',
    1,
    15,
    30,
    '/images/pillars/synergy-puzzle.jpg',
    ARRAY['/images/pillars/synergy-puzzle.jpg', '/images/hero/adventures-autumn.jpg'],
    ARRAY['Guia experiente da Backpackers', 'Oficina temática ''segredos das pedras''', 'Caderno-guia para cada família', 'Seguro de acidente pessoal + responsabilidade civil', 'Lanche partilhado no fim'],
    ARRAY['Ténis ou botas confortáveis', 'Mochila pequena com água', 'Chapéu', 'Boa disposição de família'],
    false
  ),
  (
    'passadicos-paiva-arouca',
    'Passadiços do Paiva + Ponte 516 Arouca',
    '8 km de passadiços sobre o Rio Paiva + travessia da ponte suspensa mais longa do mundo.',
    'Um dos trilhos mais icónicos de Portugal, agora combinado com a experiência que colocou Arouca no mapa turístico mundial: a Ponte 516 Arouca, a maior ponte pedonal suspensa do mundo.

Começamos nos Passadiços do Paiva, 8 km de estruturas em madeira sobre o Rio Paiva, com escadas quase intermináveis e vistas dramáticas de gargantas, cascatas e formações rochosas. É desafiante fisicamente (muitos degraus) mas não é técnico.

A meio do percurso, atravessamos a Ponte 516 pendurada 175 metros acima do rio. Vertigens são normais mas a estrutura é totalmente segura. Um mix único de aventura, engenharia e paisagem.

Saída madrugadora com transporte próprio ou partilhado desde Leiria (opcional).',
    NULL,
    NULL,
    '2026-11',
    'adventure'::public.site_event_type,
    'Arouca, Aveiro',
    'arouca',
    40.935,
    -8.246,
    'Entrada norte dos Passadiços do Paiva, Espiunca',
    '8 km + ponte',
    4,
    45,
    18,
    '/images/hero/adventures-autumn.jpg',
    ARRAY['/images/hero/adventures-autumn.jpg', '/images/events/trilho-inverno.jpg'],
    ARRAY['Guia experiente da Backpackers', 'Bilhetes de acesso aos Passadiços do Paiva', 'Bilhete de travessia da Ponte 516 Arouca', 'Seguro de acidente pessoal + responsabilidade civil', 'Snack de meio de trilho'],
    ARRAY['Boa condição física (muitos degraus)', 'Botas de trilho ou ténis com bom piso', 'Mochila com 2L de água', 'Almoço leve', 'Chapéu e protecção solar'],
    true
  ),
  (
    'pr2-termas-el-rei',
    'PR2 LRA · Rota das Termas d''El Rei',
    'Percurso circular de 6,3 km em Monte Real. Ideal para famílias, jardins e termas incluídos.',
    'Percurso circular de 6,3 km com início e fim no Jardim Municipal de Monte Real. Atravessa os Jardins do Monte Real Palace Hotel, os prados nas margens do Rio Lis, e passa pelas ruínas do Castelo de Monte Real.

É um dos trilhos mais acessíveis que fazemos, quase totalmente plano, perfeito para famílias com crianças ou para quem está a começar. Combina património histórico com natureza urbana e o clássico ambiente das termas.',
    NULL,
    NULL,
    '2026-08',
    'adventure'::public.site_event_type,
    'Monte Real, Leiria',
    'leiria',
    39.8501,
    -8.8686,
    'Jardim Municipal de Monte Real',
    '6,3 km',
    1,
    15,
    25,
    '/images/hero/adventures-autumn.jpg',
    ARRAY['/images/hero/adventures-autumn.jpg'],
    ARRAY['Guia experiente da Backpackers', 'Seguro de acidente pessoal + responsabilidade civil', 'Snack de meio de trilho'],
    ARRAY['Ténis confortável', 'Mochila com 1L de água', 'Chapéu'],
    false
  ),
  (
    'pr4-fornea',
    'PR4 PMS · Percurso da Fórnea',
    'Trilho circular de 13,2 km no vale glaciar da Fórnea, com vistas panorâmicas 360°.',
    'Percurso circular clássico da Serra de Aire e Candeeiros, com duas variantes possíveis, desenvolvendo-se na encosta do vale glaciar da Fórnea. Oferece vistas panorâmicas de 360° ao longo do percurso, atravessando zonas de calcário característico da região.

É um dos nossos trilhos favoritos porque combina desafio físico moderado com paisagens que valem cada suor. A Fórnea é um vale suspenso, geologicamente único, e o miradouro final compensa qualquer cansaço.

Grau moderado, ideal para caminhantes com alguma experiência prévia. Não recomendamos para crianças abaixo dos 12 anos.',
    NULL,
    NULL,
    '2026-09',
    'adventure'::public.site_event_type,
    'Serra de Aire e Candeeiros',
    'aire-candeeiros',
    39.5433,
    -8.735,
    'Parque de estacionamento da Fórnea, Alvados (coordenadas partilhadas por WhatsApp na véspera)',
    '13,2 km',
    4,
    25,
    20,
    '/images/hero/adventures-autumn.jpg',
    ARRAY['/images/hero/adventures-autumn.jpg', '/images/events/trilho-inverno.jpg'],
    ARRAY['Guia experiente da Backpackers', 'Seguro de acidente pessoal + responsabilidade civil', 'Registo fotográfico partilhado no fim', 'Snack de meio de trilho'],
    ARRAY['Botas de trilho ou ténis com bom piso', 'Mochila com 2L de água', 'Protecção solar (chapéu + creme)', 'Almoço leve', 'Bastões (opcional)'],
    true
  ),
  (
    'pr4-nascente-lis',
    'PR4 LRA · Nascente do Lis',
    'Percurso circular de 9,2 km pela nascente do Rio Lis. Em Setembro pode ver-se a água a brotar da rocha.',
    'Trilho circular de 9,2 km promovendo a beleza natural da nascente do Rio Lis. Em alguns meses do ano é possível ver a água a brotar de forma surpreendente das rochas. O percurso passa pelo vale da Serra da Maunça, uma zona pouco explorada com paisagens únicas.

É um trilho tranquilo, sem grandes desníveis, ideal para famílias e caminhantes iniciantes. As paisagens acompanham-nos todo o caminho.',
    NULL,
    NULL,
    '2026-09',
    'adventure'::public.site_event_type,
    'Serra da Maunça, Leiria',
    'leiria',
    39.885,
    -8.755,
    'Fonte da Nascente, Maunça (coordenadas partilhadas por WhatsApp na véspera)',
    '9,2 km',
    3,
    20,
    25,
    '/images/hero/adventures-autumn.jpg',
    ARRAY['/images/hero/adventures-autumn.jpg', '/images/events/trilho-inverno.jpg'],
    ARRAY['Guia experiente da Backpackers', 'Seguro de acidente pessoal + responsabilidade civil', 'Registo fotográfico partilhado no fim'],
    ARRAY['Botas de trilho ou ténis com bom piso', 'Mochila com 1,5L de água', 'Chapéu e protecção solar', 'Snack ligeiro'],
    false
  ),
  (
    'trilho-fendas-fatima',
    'Trilho das Fendas · Fátima',
    'Percurso pelas fendas cársicas e olivais da região de Fátima. Combina espiritualidade, geologia e paisagem.',
    'Trilho circular pela região de Fátima que atravessa fendas cársicas espectaculares, olivais milenares e passa por caminhos pouco conhecidos entre o Santuário e as áreas rurais envolventes.

É um percurso com carácter próprio: chão de pedra polida pelo tempo, aromas de tomilho e alecrim, e o silêncio característico do calcário. Combina reflexão pessoal (não religiosa) com desafio moderado, ideal para quem quer um trilho com peso mas sem grande exigência técnica.

Paragens curtas para explicação geológica e pequenas curiosidades locais que os guias turísticos convencionais não contam.',
    NULL,
    NULL,
    '2026-08',
    'adventure'::public.site_event_type,
    'Fátima, Ourém',
    'fatima',
    39.63,
    -8.672,
    'Parque de estacionamento norte do Santuário de Fátima',
    '11 km',
    3,
    22,
    22,
    '/images/hero/adventures-autumn.jpg',
    ARRAY['/images/hero/adventures-autumn.jpg', '/images/events/trilho-inverno.jpg'],
    ARRAY['Guia experiente da Backpackers', 'Seguro de acidente pessoal + responsabilidade civil', 'Snack de meio de trilho', 'Registo fotográfico partilhado no fim'],
    ARRAY['Botas de trilho ou ténis com bom piso', 'Mochila com 1,5L de água', 'Chapéu, óculos de sol, protector solar', 'Almoço leve'],
    false
  ),
  (
    'trilho-fragas-sao-simao',
    'Fragas de São Simão · Praia fluvial e trilho',
    'Percurso de 8 km pelas fragas graníticas de Figueiró dos Vinhos. Termina em praia fluvial.',
    'As Fragas de São Simão são uma das paisagens mais surpreendentes do interior do país. Fragas graníticas monumentais moldadas pela erosão, penhascos, e uma pequena aldeia recuperada encaixada no meio de tudo isto.

O trilho começa no alto e desce em direcção à ribeira, atravessando zonas de floresta autóctone e miradouros com vistas amplas sobre o Pinhal Interior. A recompensa final: praia fluvial das Fragas, com água cristalina, ideal para dar um mergulho refrescante depois do esforço.

Recomendamos vir com toalha e fato de banho para mergulhar no fim. É um dos poucos trilhos onde acaba um dia em modo verdadeiramente descontraído.',
    NULL,
    NULL,
    '2026-09',
    'adventure'::public.site_event_type,
    'Figueiró dos Vinhos, Pinhal Interior',
    'pinhal',
    39.9026,
    -8.257,
    'Aldeia de Xisto de São Simão, parque de estacionamento',
    '8 km',
    3,
    24,
    22,
    '/images/hero/adventures-autumn.jpg',
    ARRAY['/images/hero/adventures-autumn.jpg', '/images/events/trilho-inverno.jpg'],
    ARRAY['Guia experiente da Backpackers', 'Seguro de acidente pessoal + responsabilidade civil', 'Snack de meio de trilho', 'Registo fotográfico partilhado no fim'],
    ARRAY['Botas de trilho ou ténis com bom piso', 'Mochila com 2L de água', 'Chapéu e protecção solar', 'Toalha + fato de banho (praia fluvial no fim)', 'Almoço leve'],
    true
  ),
  (
    'trilho-menino-lapedo',
    'Trilho do Menino do Lapedo',
    'Trilho arqueológico onde foi descoberto o Menino do Lapedo. Percurso curto, muito rico em história.',
    'Um dos trilhos mais fascinantes que fazemos, precisamente por não ser sobre a paisagem em si mas sobre o que ela guardou durante 24 000 anos.

O Vale do Lapedo, em Leiria, foi o local onde em 1998 se descobriu o esqueleto de uma criança de 4 anos com características mistas de Homo sapiens e Neandertal, uma das descobertas mais importantes da arqueologia europeia recente.

O trilho é curto (5 km) e fácil, mas é acompanhado por narrativa constante sobre o vale, a escavação, e o que a descoberta significa. Perfeito para quem gosta de aprender enquanto caminha, e para famílias com crianças a partir dos 10 anos.',
    NULL,
    NULL,
    '2026-09',
    'adventure'::public.site_event_type,
    'Vale do Lapedo, Leiria',
    'leiria',
    39.728,
    -8.702,
    'Estacionamento do Abrigo do Lagar Velho, Lapedo',
    '5 km',
    2,
    18,
    20,
    '/images/hero/adventures-autumn.jpg',
    ARRAY['/images/hero/adventures-autumn.jpg'],
    ARRAY['Guia experiente da Backpackers', 'Narrativa arqueológica ao longo do percurso', 'Seguro de acidente pessoal + responsabilidade civil', 'Snack no fim'],
    ARRAY['Ténis ou botas confortáveis', 'Mochila com 1L de água', 'Chapéu', 'Curiosidade e paciência para paragens explicativas'],
    false
  ),
  (
    'workshop-connect-circle-aberto',
    '🗣 Connect Circle · Workshop aberto',
    'Adaptação do formato Hive Connect Circle para público individual. Roda facilitada de comunicação profunda, 8 a 12 pessoas de contextos diferentes.',
    'O Connect Circle é um dos formatos-âncora do catálogo Backpackers Synergy, normalmente entregue in-company. Esta é a versão aberta: pessoas de contextos profissionais diferentes numa roda facilitada durante 3 horas.

Cadeiras em círculo. Não há mesa. Um objecto de madeira (a bússola Backpackers) que passa de mão em mão. Só fala quem o tem. Sem interromper, sem julgar, sem responder imediatamente.

O facilitador propõe 4 a 5 perguntas ao longo da sessão, que escalam gradualmente de leve para profundo. Ideal para quem quer experimentar o formato antes de o trazer para a sua própria equipa, ou simplesmente para quem quer uma conversa que não acontece no dia-a-dia.

No fim, cada pessoa diz uma palavra sobre o que sente. Sai-se com uma introspecção que os workshops típicos raramente entregam.',
    NULL,
    NULL,
    '2026-09',
    'workshop'::public.site_event_type,
    'Leiria, espaço a confirmar',
    'leiria',
    39.7495,
    -8.8077,
    'Confirmado 3 dias antes por email',
    NULL,
    NULL,
    55,
    12,
    '/images/pillars/synergy-hive.jpg',
    ARRAY['/images/pillars/synergy-hive.jpg', '/images/events/team-facilitation.jpg', '/images/events/team-close.jpg'],
    ARRAY['3h de facilitação profissional', 'Objecto de fala (bússola Backpackers)', 'Coffee break', 'Certificado de participação', 'Follow-up por email 30 dias depois'],
    ARRAY['Vontade de participar em contexto de escuta', 'Bloco de notas ou tablet (opcional)'],
    false
  ),
  (
    'workshop-online-terreno-hibrido',
    '🧭 Terreno híbrido · Workshop online',
    '2h em Zoom para quem lidera equipas mistas: metade em casa, metade no escritório. Metáfora do trilho aplicada ao híbrido.',
    'Se lideras uma equipa híbrida, sabes o problema: metade das pessoas está em casa, metade no escritório, e mantê-las alinhadas parece que exige o triplo do esforço. Este workshop pega na metáfora que melhor conhecemos, o trilho em grupo, e aplica-a ao contexto de trabalho híbrido.

Um guia num trilho não tem toda a gente à vista o tempo todo. Sabe quem vai à frente, quem fica para trás, quando parar, como manter o ritmo do grupo apesar das diferenças. Essas mesmas competências, transpostas para o híbrido, são o que separa uma equipa remota que funciona de uma que só sobrevive.

Estrutura: 30 min de contexto e frameworks (o que aprendemos em terreno real que se aplica aqui), 60 min de exercícios em breakout rooms com casos que os participantes trazem, 30 min de discussão aberta e recomendações personalizadas.

Cada participante recebe no fim um playbook de 15 páginas com práticas concretas para aplicar já na semana seguinte.',
    NULL,
    NULL,
    '2026-10',
    'workshop'::public.site_event_type,
    'Online (Zoom)',
    'virtual',
    39.7495,
    -8.8077,
    'Link Zoom enviado 24h antes por email',
    NULL,
    NULL,
    35,
    20,
    '/images/pillars/synergy-hive.jpg',
    ARRAY['/images/pillars/synergy-hive.jpg'],
    ARRAY['2h de sessão facilitada em Zoom', 'Playbook em PDF (15 páginas)', 'Gravação da sessão para rever', 'Follow-up por email 30 dias depois', 'Certificado de participação digital'],
    ARRAY['Computador com câmara e microfone', 'Boa ligação de internet', 'Ambiente sem interrupções por 2h', 'Vontade de participar em breakout rooms'],
    false
  ),
  (
    'workshop-trail-descobre-equipa',
    'Workshop TRAIL · Descobre a tua equipa em 90 minutos',
    'Sessão presencial de 90 min com uma equipa real. Cada pessoa faz o assessment TRAIL e comparamos resultados em conjunto.',
    'O TRAIL é a ferramenta de assessment que a Backpackers Labs está a desenvolver para equipas. Este workshop é uma sessão de demonstração e primeiro contacto, ideal para equipas de gestão que queiram experimentar antes de contratar formalmente.

Como funciona: cada participante faz o assessment individual (~15 min, no telemóvel ou portátil). Depois analisamos os resultados em grupo, identificamos padrões de dinâmica de equipa, e discutimos onde estão as forças e as tensões implícitas.

No fim, cada equipa sai com: (a) mapa visual da própria dinâmica, (b) 3 recomendações accionáveis, (c) acesso continuado à plataforma TRAIL por 30 dias.

Formato in-company (levamos a facilitação até vocês) ou aberto ao público (equipas mistas de 8-12 pessoas). Este listing refere-se ao formato aberto.',
    NULL,
    NULL,
    '2026-09',
    'workshop'::public.site_event_type,
    'Leiria, espaço a confirmar',
    'leiria',
    39.7495,
    -8.8077,
    'Confirmado 3 dias antes por email',
    NULL,
    NULL,
    45,
    12,
    '/images/pillars/synergy-hive.jpg',
    ARRAY['/images/pillars/synergy-hive.jpg', '/images/events/team-facilitation.jpg'],
    ARRAY['Assessment TRAIL individual', 'Sessão de 90 min facilitada', 'Mapa visual da dinâmica de equipa', '3 recomendações accionáveis', '30 dias de acesso à plataforma TRAIL', 'Certificado de participação'],
    ARRAY['Telemóvel ou portátil com internet', 'Estar num contexto de equipa (ideal, mas não obrigatório)', 'Abertura para receber feedback'],
    false
  )
) AS v (
  slug, title, summary, description,
  starts_at, ends_at, planned_month,
  type, location, region, lat, lng,
  meeting_point, distance, difficulty, price, max_participants,
  cover_image, images, included, requirements, featured
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Feito. Verificar (esperado: 12 linhas):
--   SELECT slug, title, status, planned_month FROM public.site_events
--     ORDER BY planned_month, slug;
-- ============================================================================
