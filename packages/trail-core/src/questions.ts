// TRAIL — 42-question bank (7 per value), PT-PT.
// Some questions are reverse-scored to reduce acquiescence bias.

export type TrailSeedQuestion = {
  code: string;
  value: "T" | "R" | "I" | "L" | "H" | "A";
  statement: string;
  reverseScored: boolean;
  sortOrder: number;
};

export const TRAIL_QUESTIONS: TrailSeedQuestion[] = [
  // T — Transformação
  { code: "T01", value: "T", statement: "Prefiro projectos onde saio diferente de como entrei.", reverseScored: false, sortOrder: 1 },
  { code: "T02", value: "T", statement: "Vale a pena procurar situações que me desafiam mesmo quando são desconfortáveis.", reverseScored: false, sortOrder: 2 },
  { code: "T03", value: "T", statement: "Uma rotina estável durante anos é o que faz melhor para mim.", reverseScored: true, sortOrder: 3 },
  { code: "T04", value: "T", statement: "Quando aprendo algo novo, sinto que valeu mais do que o esforço.", reverseScored: false, sortOrder: 4 },
  { code: "T05", value: "T", statement: "Escolho as pessoas com quem trabalho pelo quanto me fazem crescer.", reverseScored: false, sortOrder: 5 },
  { code: "T06", value: "T", statement: "Prefiro manter-me na minha zona de conforto sempre que possível.", reverseScored: true, sortOrder: 6 },
  { code: "T07", value: "T", statement: "Se pudesse, mudaria de área profissional só para explorar algo novo.", reverseScored: false, sortOrder: 7 },

  // R — Respeito
  { code: "R01", value: "R", statement: "Antes de decidir, consulto as pessoas que a decisão afecta.", reverseScored: false, sortOrder: 1 },
  { code: "R02", value: "R", statement: "Quando um colega discorda de mim, tento perceber o ponto de vista dele antes de reagir.", reverseScored: false, sortOrder: 2 },
  { code: "R03", value: "R", statement: "As opiniões dos outros importam-me menos do que os dados objectivos.", reverseScored: true, sortOrder: 3 },
  { code: "R04", value: "R", statement: "Um ambiente inclusivo é mais importante do que velocidade de execução.", reverseScored: false, sortOrder: 4 },
  { code: "R05", value: "R", statement: "Consigo trabalhar bem com pessoas muito diferentes de mim.", reverseScored: false, sortOrder: 5 },
  { code: "R06", value: "R", statement: "Prefiro decisões rápidas mesmo que alguém fique de fora.", reverseScored: true, sortOrder: 6 },
  { code: "R07", value: "R", statement: "Reconheço publicamente o trabalho dos outros mesmo quando não é esperado.", reverseScored: false, sortOrder: 7 },

  // I — Inovação
  { code: "I01", value: "I", statement: "Sinto-me frustrado quando as coisas se fazem «como sempre se fizeram».", reverseScored: false, sortOrder: 1 },
  { code: "I02", value: "I", statement: "Prefiro tentar uma solução nova em vez de replicar uma que já funcionou.", reverseScored: false, sortOrder: 2 },
  { code: "I03", value: "I", statement: "A tradição existe por boas razões e deve ser respeitada.", reverseScored: true, sortOrder: 3 },
  { code: "I04", value: "I", statement: "Quando vejo um processo, penso imediatamente em como o melhorar.", reverseScored: false, sortOrder: 4 },
  { code: "I05", value: "I", statement: "Mostro o meu trabalho antes de estar «perfeito» para ouvir feedback.", reverseScored: false, sortOrder: 5 },
  { code: "I06", value: "I", statement: "Prefiro planos detalhados antes de agir em vez de improvisar.", reverseScored: true, sortOrder: 6 },
  { code: "I07", value: "I", statement: "Uma ideia meio-feita já vale a pena partilhar.", reverseScored: false, sortOrder: 7 },

  // L — Liberdade
  { code: "L01", value: "L", statement: "Trabalho melhor quando me deixam em paz para executar.", reverseScored: false, sortOrder: 1 },
  { code: "L02", value: "L", statement: "Não preciso de aprovação para tomar decisões dentro da minha área.", reverseScored: false, sortOrder: 2 },
  { code: "L03", value: "L", statement: "Prefiro estruturas hierárquicas claras onde sei sempre a quem reportar.", reverseScored: true, sortOrder: 3 },
  { code: "L04", value: "L", statement: "O meu maior valor está em escolher onde e como faço o trabalho.", reverseScored: false, sortOrder: 4 },
  { code: "L05", value: "L", statement: "Aceito facilmente ordens de superiores sem as questionar.", reverseScored: true, sortOrder: 5 },
  { code: "L06", value: "L", statement: "Se um projecto me limita muito, prefiro sair a adaptar-me.", reverseScored: false, sortOrder: 6 },
  { code: "L07", value: "L", statement: "Sinto-me mal quando não posso decidir o meu próprio ritmo.", reverseScored: false, sortOrder: 7 },

  // H — Harmonia
  { code: "H01", value: "H", statement: "Quando há tensão na equipa, procuro mediá-la em vez de ignorar.", reverseScored: false, sortOrder: 1 },
  { code: "H02", value: "H", statement: "Prefiro perder um argumento a criar um conflito duradouro.", reverseScored: false, sortOrder: 2 },
  { code: "H03", value: "H", statement: "Confronto directo é sempre melhor que qualquer forma de negociação.", reverseScored: true, sortOrder: 3 },
  { code: "H04", value: "H", statement: "Sinto-me responsável pelo clima emocional do grupo em que estou.", reverseScored: false, sortOrder: 4 },
  { code: "H05", value: "H", statement: "O trabalho em equipa vale mais do que o resultado individual.", reverseScored: false, sortOrder: 5 },
  { code: "H06", value: "H", statement: "Sacrifico o meu próprio conforto para o grupo estar bem.", reverseScored: false, sortOrder: 6 },
  { code: "H07", value: "H", statement: "Prefiro trabalhar sozinho para não lidar com as emoções dos outros.", reverseScored: true, sortOrder: 7 },

  // A — Aventura
  { code: "A01", value: "A", statement: "Estou disposto a arriscar tempo ou dinheiro por uma oportunidade nova.", reverseScored: false, sortOrder: 1 },
  { code: "A02", value: "A", statement: "Prefiro projectos com resultado incerto mas alto potencial.", reverseScored: false, sortOrder: 2 },
  { code: "A03", value: "A", statement: "Sinto-me pouco à vontade quando não sei como algo vai acabar.", reverseScored: true, sortOrder: 3 },
  { code: "A04", value: "A", statement: "Já entrei em algo importante sem plano detalhado, só com boa intuição.", reverseScored: false, sortOrder: 4 },
  { code: "A05", value: "A", statement: "Aventura física (viajar, actividades ao ar livre) é parte importante da minha vida.", reverseScored: false, sortOrder: 5 },
  { code: "A06", value: "A", statement: "Prefiro escolhas seguras a apostas com risco alto.", reverseScored: true, sortOrder: 6 },
  { code: "A07", value: "A", statement: "Novas culturas, línguas ou contextos energizam-me.", reverseScored: false, sortOrder: 7 },
];
