// TRAIL — Deep per-pillar content for the extended report.
//
// Each pillar (T, R, I, L, H, A) has:
//   - shortLabel + emoji
//   - description (2 short paragraphs)
//   - behaviors (how it shows up day-to-day)
//   - strengths (upside)
//   - shadows (blind spots when overused / isolated)
//   - scoreBands (interpretation for low / mid / high)
//   - growthPaths (how to develop this pillar if you want more of it)
//   - interactions (how you tend to relate to people high in each OTHER pillar)
//
// All markdown, PT-PT.

import type { TrailValueKey } from "@/lib/db/schema";

export type ScoreBand = "low" | "mid" | "high";

export type PillarContent = {
  key: TrailValueKey;
  name: string;
  emoji: string;
  short: string;
  description: string;
  behaviors: string[];
  strengths: string[];
  shadows: string[];
  scoreBands: Record<ScoreBand, string>;
  growthPaths: string[];
  interactions: Partial<Record<TrailValueKey, string>>;
};

export const TRAIL_CONTENT: Record<TrailValueKey, PillarContent> = {
  // ==========================================================================
  // T — TRANSFORMAÇÃO
  // ==========================================================================
  T: {
    key: "T",
    name: "Transformação",
    emoji: "🔄",
    short:
      "Motor de mudança. Procura crescer, adaptar-se e reinventar-se. Tolera bem o desconforto que a evolução traz.",
    description:
      "A Transformação é o valor que empurra para o **movimento interior contínuo**. Quem pontua alto neste pilar interpreta a vida como uma série de metamorfoses — cada projecto, cada relação, cada crise é ocasião para sair diferente. Aprender é mais importante do que dominar; evoluir é mais importante do que chegar.\n\nA sombra do valor está na dificuldade de aterrar. A pessoa muito transformadora pode viver em estado de permanente reinvenção — o que às vezes é fuga disfarçada de crescimento. O caminho maduro do T é saber quando parar de mudar e quando deixar o novo consolidar-se.",
    behaviors: [
      "Sente-se energizada por projectos onde vai sair diferente",
      "Procura feedback difícil em vez de o evitar",
      "Muda de área profissional ou de contexto com mais facilidade que a média",
      "Vê a estabilidade prolongada como estagnação",
      "Recicla identidades sem drama — 'já não sou aquela pessoa'",
    ],
    strengths: [
      "Adaptabilidade real quando o contexto muda",
      "Motor de mudança para equipas presas em rotinas",
      "Boa resiliência a crises porque as encara como oportunidade",
      "Aprendizagem rápida e curiosidade duradoura",
    ],
    shadows: [
      "Fadiga de reinvenção — muda antes de a mudança anterior consolidar",
      "Cansa colegas que precisam de estabilidade para produzir",
      "Pode confundir 'crescimento' com fuga de compromissos difíceis",
      "Subestima o valor de dominar algo até ao fundo",
    ],
    scoreBands: {
      low: "Uma pontuação baixa em Transformação (**< 40**) significa que preferes contexto estável e continuidade. Isto não é rigidez — é uma forma legítima de gerar valor através de consistência prolongada. Consegues aprofundar competências que quem muda muito nunca terá. O risco é ficar preso quando o contexto real muda à tua volta e insistes no antigo modelo.",
      mid: "Uma pontuação média (**40-70**) mostra que abraças mudança quando ela é justificada, mas não a procuras por si só. Costumas ser a pessoa que a equipa procura para *validar* uma mudança em curso — 'faz sentido? é boa altura?'. É um perfil valioso em fases de transição controlada. Cuidado em ambientes que exigem reinvenção contínua — podes sentir-te esgotado se o ritmo for muito alto.",
      high: "Uma pontuação alta (**> 70**) revela um dos motores de mudança da equipa. Vives melhor em fases de arranque, pivot ou reinvenção. Aborreces-te em regimes estáveis e podes assumir riscos que outros consideram excessivos. A tua tarefa madura é aprender a **aterrar** — ficar tempo suficiente numa fase para colher resultados antes de saltar para a próxima.",
    },
    growthPaths: [
      "Praticar rituais de fecho: fecha ciclos formalmente antes de começar o próximo",
      "Escolhe UM projecto onde te comprometes a ficar 2 anos sem pivots — treina profundidade",
      "Aprende a distinguir mudança-como-fuga de mudança-como-evolução (útil: pergunta a 3 pessoas próximas)",
      "Adiciona um 'porteiro' à tua vida — alguém que te desafia quando queres mudar cedo demais",
    ],
    interactions: {
      R: "Podes atropelar quem quer consultar antes de mudar. Aprende a esperar — a Respeito muitas vezes vê ângulos que a Transformação perde na pressa. Pergunta antes de decidir mudanças que afectam a equipa.",
      I: "Sinergia natural — ambos querem o novo. Cuidado com dispersão colectiva. Uma equipa T+I precisa de alguém H ou R para consolidar decisões antes de saltar para a próxima ideia.",
      L: "Aliados poderosos — ambos aceitam alto risco pessoal para mudar contexto. Perigo: ambos podem sair de um projecto sem 'entregar a chave'. Combinar Transformação com senso de completar.",
      H: "H é o teu contraponto essencial. Onde tu vês oportunidade de mudar, o H vê o custo emocional para o grupo. Ouve — o H estabiliza-te; tu energizas o H.",
      A: "Complementares — Aventura energiza o teu movimento com risco calculado. Cuidado com escaladas: ambos podem transformar um pivot em maratona sem sono. Definam bordas.",
    },
  },

  // ==========================================================================
  // R — RESPEITO
  // ==========================================================================
  R: {
    key: "R",
    name: "Respeito",
    emoji: "🤝",
    short:
      "Ancora a acção nas pessoas. Ouve antes de decidir. Vê a diversidade como fonte de riqueza, não obstáculo.",
    description:
      "O Respeito é o valor que mantém o **outro presente** na equação. Quem pontua alto neste pilar não decide sem primeiro entender de onde vêm as pessoas afectadas. Vê as diferenças de perspectiva como recurso, não fricção. Consegue mediar sem se apagar.\n\nA sombra do R aparece quando a preocupação com o outro se torna paralisia. Consultar todos antes de decidir pode virar procrastinação estratégica. A pessoa muito R às vezes evita conflitos que precisavam de acontecer — 'para não magoar ninguém', quando na verdade o silêncio faz mais dano.",
    behaviors: [
      "Consulta as pessoas que a decisão afecta antes de decidir",
      "Prefere reunião a decisão unilateral, mesmo com custo de tempo",
      "Reconhece contribuições em público, não só em privado",
      "Interrompe reuniões para dar espaço a quem não falou",
      "Guarda os detalhes pessoais dos colegas na memória (aniversários, situações)",
    ],
    strengths: [
      "Cria segurança psicológica — as pessoas dizem o que pensam",
      "Trabalha bem com equipas culturalmente diversas",
      "Reduz drama e drama secundário em equipa",
      "Bom mediador em conflito latente",
    ],
    shadows: [
      "Consulta paralisante — tempo perdido em consensos que nunca acontecem",
      "Evita dar feedback duro por medo de magoar",
      "Pode ser explorado por quem 'usa' o R para atrasar decisões",
      "Sacrifica velocidade e qualidade em nome de inclusão",
    ],
    scoreBands: {
      low: "Uma pontuação baixa em Respeito (**< 40**) sugere que decides mais rápido do que a média, muitas vezes sem consulta. Isto **não é falta de humanidade** — é foco em velocidade e clareza. Funciona bem em contextos onde a decisão é reversível ou o custo do atraso é maior que o custo de errar. O risco é criar equipas onde as pessoas se sentem ignoradas e param de contribuir. Podes ganhar imenso ouvindo mais uma vez antes de agir.",
      mid: "Uma pontuação média (**40-70**) mostra que consegues equilibrar consulta com decisão. És a pessoa que ouve o suficiente para decidir bem, sem cair em paralisia. Isto é um perfil raro e valioso em gestão. Cuidado: em fases de crise podes deslizar para o modo 'decidir sozinho' — usa essa liberdade com consciência.",
      high: "Uma pontuação alta (**> 70**) revela alguém que vê o outro constantemente. És provavelmente a pessoa a quem a equipa recorre para 'como devo dizer isto?'. Isto tem valor imenso em equipa multicultural, em fusões, em conflito. O teu risco maduro é aprender a **decidir apesar de ouvir**: consultar não te obriga a esperar consenso. Quando a decisão te toca a ti, decide.",
    },
    growthPaths: [
      "Define para ti mesmo um 'tempo máximo de consulta' antes de cada decisão. Se ao fim de X dias a informação não é decisiva, avança",
      "Pratica dar feedback difícil — começa com pequenas coisas para treinar",
      "Distingue 'ser gentil' de 'ser honesto' — muitas vezes o feedback duro é a maior forma de respeito",
      "Aprende a dizer 'não' sem justificar em excesso",
    ],
    interactions: {
      T: "Podes atrasar-te em consultas quando o T quer avançar. Não é mau — muitas vezes salvas o T de decisões precipitadas. Mas às vezes tens de deixar o T correr e observar o que acontece.",
      I: "Consegues integrar as ideias I no grupo — sem ti muitas ideias I ficam pelo criador. Cuidado com edição em excesso — nem toda a ideia I precisa de ser suavizada para o grupo aceitar.",
      L: "Fricção potencial: o L não gosta de ser consultado sobre decisões dele. Aprende a distinguir decisões que afectam o grupo (consultar) das decisões pessoais do L (deixar em paz).",
      H: "Aliados naturais — ambos protegem o grupo. Perigo: em conjunto podem virar câmara de eco onde nada difícil acontece. Alguém T ou I precisa de estar na mesa.",
      A: "O A pode achar-te lento. É perceber que o R e o A vivem em ritmos diferentes: A quer arriscar já, R quer pensar quem afecta. Combinar bem = R faz a A parar 30 segundos, A faz o R avançar depois.",
    },
  },

  // ==========================================================================
  // I — INOVAÇÃO
  // ==========================================================================
  I: {
    key: "I",
    name: "Inovação",
    emoji: "💡",
    short:
      "Mente ideacional. Vê processos como algo a repensar. Vive melhor onde 'como sempre se fez' é questionável.",
    description:
      "A Inovação é o valor que questiona sistematicamente **como as coisas se fazem**. Quem pontua alto neste pilar tem uma cabeça que reformata processos automaticamente — vê um formulário e pensa como o simplificar; vê uma reunião e pensa se precisava de existir. Prefere protótipo cedo a plano perfeito.\n\nA sombra do I aparece quando a ideação é infinita e a execução mínima. Muitas ideias meio-feitas não valem uma ideia bem executada. A pessoa muito I às vezes precisa de aprender que a chatice do 'trabalho de baixo nível' — email, admin, seguimento — é onde as ideias se transformam em impacto.",
    behaviors: [
      "Sugere alternativas mesmo quando ninguém pediu",
      "Prototipa em papel ou digital em vez de fazer plano detalhado",
      "Aborrece-se em reuniões repetitivas",
      "Colecciona referências (livros, apps, pessoas) obsessivamente",
      "Fica genuinamente surpreendido quando outros não vêem 'a maneira óbvia'",
    ],
    strengths: [
      "Motor de melhoria contínua — nada fica no piloto automático perto de ti",
      "Vantagem competitiva em mercados em mudança",
      "Bom em contextos de startup / novo produto",
      "Faz outros pensar diferente só por estar na sala",
    ],
    shadows: [
      "Muitas ideias abertas, poucas fechadas",
      "Frustra quem precisa de estabilidade para produzir",
      "Subestima o valor do 'trabalho chato' (documentação, seguimento, admin)",
      "Pode criar caos organizacional se não for balanceado por H ou R",
    ],
    scoreBands: {
      low: "Uma pontuação baixa em Inovação (**< 40**) revela alguém que valoriza processos testados e resultados previsíveis. Podes ser a pessoa que faz o sistema funcionar dia após dia — inestimável em áreas onde erro custa caro (contabilidade, segurança, operações críticas). O risco é continuar a defender o processo antigo quando ele já não serve. Uma ou duas experiências de tentar algo novo por ano manterão a tua elasticidade.",
      mid: "Uma pontuação média (**40-70**) mostra que sabes quando inovar e quando manter. Não és refém nem do novo nem do antigo. És provavelmente a pessoa a quem a equipa pergunta 'vale a pena mudar isto?'. Este é um perfil pragmático e útil em gestão de mudança.",
      high: "Uma pontuação alta (**> 70**) revela uma cabeça em ideação permanente. És um recurso essencial em fase de descoberta, prototipagem, novos produtos. O teu risco maduro é aprender a **fechar**: menos ideias, mais impacto por ideia. Escolhe UMA ideia por trimestre e leva até ao mercado. As outras arquivas para depois.",
    },
    growthPaths: [
      "Toma uma decisão trimestral: das X ideias que tens, quais vão sair? Corta o resto sem drama",
      "Aprende a produzir documentação — é onde as ideias I ganham vida em quem não estava na sala",
      "Emparelha-te com alguém H ou R para executar o que idealizas",
      "Dá tempo real ao trabalho de manutenção — não é 'chato', é onde a inovação toca chão",
    ],
    interactions: {
      T: "Sinergia natural. Ambos empurram para o novo. Perigo: sem H ou R na equipa, viram bola de neve sem ninguém a segurar. Emparelha o par TI com um par HR sempre.",
      R: "O R pode atrasar as tuas ideias em consulta. Isto é frustrante mas útil — muitas vezes o R vê as pessoas que as tuas ideias esquecem. Ouve.",
      L: "Ambos querem autonomia. Perigo colectivo: ninguém quer 'segurar a régua'. Combinem quem é dono de cada decisão antes de começarem.",
      H: "Contraponto essencial. O H pergunta 'e as pessoas afectadas?' — pergunta que o I muitas vezes salta. Ouve o H antes de mudar processos que envolvem pessoas.",
      A: "Complementares. A executa o que tu idealizas. Combinem cedo — muitas ideias I ficam pelo ideólogo porque o A já foi para outra aventura.",
    },
  },

  // ==========================================================================
  // L — LIBERDADE
  // ==========================================================================
  L: {
    key: "L",
    name: "Liberdade",
    emoji: "🕊️",
    short:
      "Autonomia como pré-requisito de energia. Trabalha melhor sem microgestão. Prefere sair a adaptar-se a limites artificiais.",
    description:
      "A Liberdade é o valor que **precisa de espaço próprio** para funcionar. Quem pontua alto neste pilar produz o seu melhor quando ninguém está a olhar por cima do ombro. Aceita mal a hierarquia arbitrária — respeita competência e autoria, não título.\n\nA sombra do L é o isolamento silencioso. Preferir autonomia por vezes vira 'não pergunto a ninguém'. A pessoa muito L pode desalinhar-se da equipa sem se aperceber, ou tomar decisões que afectam outros sem consultar porque 'era o meu espaço'. O caminho maduro do L é aprender que liberdade é diferente de isolamento — a autonomia madura sabe onde termina.",
    behaviors: [
      "Prefere trabalhar em blocos longos sem interrupção",
      "Aceita mal 'reportar' regularmente se sente que perde autonomia",
      "Escolhe empregadores/parceiros pela liberdade que oferecem, não pelo salário",
      "Reage mal a microgestão mesmo bem-intencionada",
      "Sai de projectos onde não pode decidir dentro do seu âmbito",
    ],
    strengths: [
      "Auto-motivação alta — não precisa de supervisão para produzir",
      "Boa em ambientes remotos / distribuídos",
      "Contribui com autoria própria — o trabalho tem 'assinatura'",
      "Não drama por ausência de estrutura",
    ],
    shadows: [
      "Isolamento silencioso — perde alinhamento com equipa sem saber",
      "Pode confundir 'liberdade' com 'não prestar contas'",
      "Reage exagerado a estruturas úteis (rituais, checkpoints)",
      "Deixa projectos por causas menores se sentir que a autonomia é ameaçada",
    ],
    scoreBands: {
      low: "Uma pontuação baixa em Liberdade (**< 40**) revela alguém que produz bem em estrutura — hierarquia clara, tarefas definidas, feedback regular. Isto é raro e valioso — muitas equipas precisam de pessoas que não desafiem cada decisão. O risco é aceitar más decisões pela conforto da hierarquia. Aprende a levantar a mão quando o processo está errado.",
      mid: "Uma pontuação média (**40-70**) mostra que valorizas autonomia mas aceitas estrutura útil. És provavelmente a pessoa que trabalha bem em qualquer tipo de organização, desde que ela funcione. Cuidado em ambientes muito rígidos — podes ficar sem perceber que estás a apagar-te.",
      high: "Uma pontuação alta (**> 70**) revela alguém para quem a autonomia é oxigénio. Escolhes trabalho e parceiros pelo espaço que dão, não pelo salário. Este é um perfil comum em empreendedores, freelancers, criativos. O risco maduro é aprender que **liberdade sem accountability é ilusão**. Prestar contas do que decides não te tira liberdade — dá-te credibilidade para pedir mais.",
    },
    growthPaths: [
      "Introduz na tua vida rituais de accountability voluntária — uma pessoa a quem contas o que estás a fazer, semanalmente",
      "Pratica pedir feedback antes de precisares — muda a dinâmica de 'ser vigiado' para 'escolher partilhar'",
      "Aprende a distinguir microgestão real de estrutura útil — nem tudo o que constrange é opressão",
      "Escreve mais o que decides e porquê — a autonomia madura deixa rasto para os outros verem",
    ],
    interactions: {
      T: "Complementares — ambos aceitam mudança de contexto. Perigo: ambos podem sair de um projecto quando fica pesado. Combinem quem sustenta o barco quando o outro salta.",
      R: "Fricção natural. O R quer consultar; tu queres decidir. Aprende a distinguir decisões que afectam grupo (consultar) das tuas (decidir e informar). Se não distinguires, o R vai sempre achar-te ausente.",
      I: "Ambos querem autonomia. Perigo colectivo: ninguém segura a régua. Definam owner de cada decisão desde o início. O par LI produz o melhor trabalho quando cada um sabe o seu perímetro.",
      H: "O H pode achar-te distante — preocupa-se com o clima do grupo, e tu preferes estar 'no teu canto'. Não é mal — é diferente. Comunica de vez em quando o teu estado interno; poupa energia ao H a tentar adivinhar.",
      A: "Aliados de risco. Ambos aceitam sair da zona de conforto por autonomia + aventura. Perigo: em conjunto podem tomar decisões grandes sem consultar ninguém. Um par LA precisa de disciplina de partilha.",
    },
  },

  // ==========================================================================
  // H — HARMONIA
  // ==========================================================================
  H: {
    key: "H",
    name: "Harmonia",
    emoji: "🌿",
    short:
      "Guardião do clima do grupo. Prefere mediar a impor. Sente responsabilidade pelo bem-estar colectivo.",
    description:
      "A Harmonia é o valor que **cuida do clima invisível**. Quem pontua alto neste pilar sabe imediatamente quando algo está estranho na sala — antes de alguém dizer. Prefere mediar conflitos a evitá-los; sacrifica conforto pessoal para o grupo estar bem.\n\nA sombra do H é apagar-se para o grupo estar em paz. A pessoa muito H pode passar a vida a gerir emoções alheias e nunca cuidar das próprias. A médio prazo isto gera ressentimento, esgotamento, ou uma forma silenciosa de superioridade ('sou eu que carrego este grupo'). O caminho maduro do H é aprender que o auto-cuidado não é egoísmo — é pré-condição de continuar a cuidar dos outros.",
    behaviors: [
      "Sente responsabilidade pelo clima emocional de qualquer grupo em que está",
      "Prefere perder um argumento a criar tensão duradoura",
      "Interrompe conflitos crescentes para mediar",
      "Lê linguagem corporal e tom em vez de só palavras",
      "Cuida logisticamente do grupo (café, comida, conforto) mesmo em contextos profissionais",
    ],
    strengths: [
      "Cria segurança emocional — as pessoas sentem-se cuidadas",
      "Impede escalada de conflito antes de virar dano permanente",
      "Bom em fase de fusão / reestruturação / crise de equipa",
      "Retenção de pessoas — as equipas H+R têm baixo turnover",
    ],
    shadows: [
      "Apagamento — cuida tanto do grupo que não cuida de si",
      "Evita conflitos que precisavam de acontecer",
      "Ressentimento silencioso quando o esforço não é reconhecido",
      "Pode ser explorado por pessoas que 'saem sempre sem apanhar a conta emocional'",
    ],
    scoreBands: {
      low: "Uma pontuação baixa em Harmonia (**< 40**) revela alguém que **não sente responsabilidade automática** pelo clima do grupo. Isto não é frieza — é uma diferença de foco. Podes ser a pessoa que traz clareza a discussões emperradas por gestão emocional. O risco é ficar surpreendido quando pessoas se afastam de ti — o clima importa para elas mesmo que não para ti. Podes ganhar imenso perguntando de vez em quando 'como estás?' antes de saltar para o negócio.",
      mid: "Uma pontuação média (**40-70**) mostra que consegues equilibrar cuidado com franqueza. Estás atento ao clima, mas não vives a gerir emoções alheias. Este é um perfil raro em ambientes profissionais e valioso em gestão. Cuidado em contextos de crise — podes deslizar para modo 'não é comigo' quando na verdade a equipa precisava de ti.",
      high: "Uma pontuação alta (**> 70**) revela o guardião do grupo. És a pessoa que a equipa procura quando algo está estranho — mesmo que não a nomeiem oficialmente. Este é um perfil raro e essencial em qualquer organização humana. O teu risco maduro é aprender a **cuidar de ti primeiro**. Não é egoísmo — é dar continuidade ao cuidado que fazes. Um H esgotado não cuida de ninguém.",
    },
    growthPaths: [
      "Reserva tempo semanal SÓ para ti — sem cuidar de ninguém. Vale um estranho na floresta a ler",
      "Aprende a dizer 'agora não posso' sem sentir que estás a falhar",
      "Diz o que precisas antes de os outros adivinharem — poupa-te ressentimento",
      "Pratica confronto directo em coisas pequenas para treinar músculo — 'estava a comer isso' é um bom começo",
    ],
    interactions: {
      T: "Contraponto essencial. O T empurra mudança; tu proteges o custo humano da mudança. Não te oponhas por reflexo — o T muitas vezes tem razão. Mas insiste no ritmo humano.",
      R: "Aliados naturais. Cuidado com câmara de eco — ambos protegem o grupo, e podem eliminar decisões difíceis 'para poupar as pessoas'. Deixem espaço a T ou I para trazer o desconfortável.",
      I: "O I muda processos sem sentir o custo emocional. Traduz para o I o impacto humano — ele agradece mesmo que pareça impaciente inicialmente.",
      L: "O L pode parecer-te distante. Não é rejeição — é forma diferente de estar. Não interpretes silêncio como problema. Pergunta directamente, obtém resposta directa, deixa em paz.",
      A: "O A quer aventura; tu queres coesão. Não é oposição — é ritmo diferente. Podes agarrar o A com propósito colectivo: 'vamos correr esse risco juntos'.",
    },
  },

  // ==========================================================================
  // A — AVENTURA
  // ==========================================================================
  A: {
    key: "A",
    name: "Aventura",
    emoji: "🏔️",
    short:
      "Vive melhor onde o resultado é incerto. Aceita risco calculado. Novos contextos energizam.",
    description:
      "A Aventura é o valor que **entra no incerto sem drama**. Quem pontua alto neste pilar procura contextos onde o resultado não está definido — geograficamente novos, profissionalmente arriscados, culturalmente diferentes. Vê o risco como estimulante, não ameaçador.\n\nA sombra do A é a escalada sem freio. A pessoa muito A pode aceitar riscos que não devia — não porque não vê o custo, mas porque a excitação silencia o custo. A médio prazo isto gera falências, relações partidas, ou uma forma de vício adrenalínico. O caminho maduro do A é aprender que aventura sustentável requer bases fortes — dinheiro guardado, relações estáveis, corpo cuidado.",
    behaviors: [
      "Escolhe férias em sítios que nunca conheceu",
      "Aceita projectos com resultado incerto mesmo com salário menor",
      "Aborrece-se em contextos previsíveis",
      "Aprende línguas / desportos novos com facilidade",
      "Aceita convites de última hora se o destino é interessante",
    ],
    strengths: [
      "Alta tolerância a incerteza — funciona em contextos ambíguos",
      "Boa em vendas, expansão, mercado novo",
      "Traz energia a equipas que ficam presas em rotina",
      "Constrói rede de contactos ampla (mais culturas, mais contextos)",
    ],
    shadows: [
      "Escalada sem freio — cada aventura maior que a anterior até crash",
      "Subestima consistentemente riscos financeiros e físicos",
      "Cansa parceiros que precisam de base estável",
      "Fica sem paciência para rotinas necessárias (contabilidade, saúde preventiva)",
    ],
    scoreBands: {
      low: "Uma pontuação baixa em Aventura (**< 40**) revela alguém que valoriza previsibilidade e estabilidade. Este é o perfil que constrói infra-estrutura sólida em qualquer projecto — casa, poupança, negócio sustentável. O risco é ficar preso em zonas de conforto que já não te servem por medo do incerto. Uma pequena aventura por ano — viagem, projecto lateral, novo hobby — mantém a tua elasticidade sem quebrar a base.",
      mid: "Uma pontuação média (**40-70**) mostra que aceitas risco calculado. Não és refém nem do seguro nem do arriscado. És provavelmente a pessoa que faz a análise antes de saltar — e depois salta. Este é um perfil pragmático e útil em decisões de médio-longo prazo.",
      high: "Uma pontuação alta (**> 70**) revela alguém para quem novos contextos são combustível vital. Empreendedores, exploradores, jornalistas de guerra, hikers de longa distância — este é o perfil. O teu risco maduro é aprender a **calcular o risco antes de o aceitar**. Não deixes de correr — mas conhece o mapa. Faz base forte para poderes aventurar-te mais tempo.",
    },
    growthPaths: [
      "Antes de cada nova aventura, define 'condições de paragem' — quando saio, quando desligo, o que perco",
      "Constrói base financeira suficiente para 6 meses sem aventura — dá-te melhor selecção de aventuras",
      "Cuida do corpo activamente — a aventura sustentável precisa de máquina que funciona",
      "Emparelha com alguém H ou R que ancora enquanto tu exploras — protege os dois",
    ],
    interactions: {
      T: "Complementares — ambos aceitam risco de mudança. Perigo colectivo: podem transformar um pivot em maratona sem sono. Definam bordas antes de começar.",
      R: "O R pode achar-te apressado — vai avisar-te dos custos humanos. Ouve. Muitas vezes a tua aventura tem custo em pessoas que tu não vês.",
      I: "Aliança poderosa. A executa o que I idealiza. Combinem cedo — muitas ideias I não saem porque falta o A a puxar para a acção.",
      L: "Aliados de risco. Perigo: em conjunto podem tomar decisões grandes sem consultar. Um par LA precisa de disciplina de partilha e checkpoints.",
      H: "Contraponto útil. O H vai perguntar 'quem sofre este risco contigo?'. Não é para te travar — é para tornar a aventura sustentável para o grupo. Em relações duradouras (parceiro, sócios), respeita esta pergunta.",
    },
  },
};

// ---------------------------------------------------------------------------
// Adaptive interpretation
// ---------------------------------------------------------------------------

export function scoreBandFor(score: number): ScoreBand {
  if (score < 40) return "low";
  if (score >= 70) return "high";
  return "mid";
}

/** Overall reading synthesised from the full profile, not just top+bottom. */
export function overallReading(
  scores: Record<TrailValueKey, number>,
): string {
  const entries = (Object.keys(scores) as TrailValueKey[]).map((k) => ({
    key: k,
    score: scores[k],
    band: scoreBandFor(scores[k]),
  }));
  const highs = entries.filter((e) => e.band === "high");
  const lows = entries.filter((e) => e.band === "low");
  const range = Math.max(...entries.map((e) => e.score)) -
    Math.min(...entries.map((e) => e.score));

  const parts: string[] = [];

  if (range < 20) {
    parts.push(
      "O teu perfil é **equilibrado** — os seis eixos ficam numa banda estreita. Isto sugere que consegues activar diferentes valores conforme o contexto pede, sem um dominante rígido. Em equipas, este perfil funciona bem como ponte entre pessoas com traços mais extremos.",
    );
  } else if (range > 40) {
    parts.push(
      "O teu perfil é **contrastado** — há muita distância entre o teu valor mais forte e o mais fraco. Isto quer dizer que tens áreas de força muito reconhecíveis (as pessoas dizem 'ela é super X') mas também áreas onde consistentemente precisas de apoio. Não é sinal de imaturidade — é sinal de perfil definido. Os perfis contrastados costumam ser bons especialistas ou co-fundadores que se complementam com opostos.",
    );
  } else {
    parts.push(
      "O teu perfil tem **contornos claros** mas não extremos. Há valores dominantes que te distinguem, sem áreas de fragilidade acentuada. É um perfil versátil, útil em posições de gestão média onde precisas de fazer bem várias coisas sem excelência absoluta em nenhuma.",
    );
  }

  if (highs.length >= 3) {
    parts.push(
      `Tens **${highs.length} valores acima de 70** — a tua identidade é multi-facetada. Cuidado com dispersão: quando tens muitos valores fortes, podes tentar servir todos e cansar-te. Escolhe conscientemente onde investir num dado período.`,
    );
  }
  if (highs.length === 0) {
    parts.push(
      "Nenhum dos teus valores ultrapassa 70. Isto pode significar que ainda estás a descobrir quem és nas várias dimensões, ou que preferes moderação em todos os eixos. Faz o assessment de novo daqui a 6 meses — os perfis moderados costumam consolidar-se com tempo.",
    );
  }

  if (lows.length >= 3) {
    parts.push(
      `Tens **${lows.length} valores abaixo de 40**. Isto não é fraqueza — é foco. Sabes o que **não é** teu. Em equipa, precisas de pessoas que trazem estes valores — os teus complementos naturais. Não tentes ser todas as coisas; procura os outros que fecham o círculo.`,
    );
  }

  parts.push(
    "**Uma nota importante:** este perfil não é um diagnóstico. Cada eixo é um espectro que se activa de forma diferente em contextos diferentes. Podes ter pontuado 30 em Aventura porque hoje precisas de estabilidade, e 80 daqui a 3 anos quando estiveres pronto para arriscar. Volta ao TRAIL de vez em quando — o objectivo é reflexão, não etiqueta.",
  );

  return parts.join("\n\n");
}
