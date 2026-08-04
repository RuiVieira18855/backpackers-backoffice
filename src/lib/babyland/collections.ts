/**
 * Definição das coleções da BabyLand editáveis no Outpost.
 *
 * A app lê estas coleções do Firestore com um fallback estático embutido, portanto
 * o que for escrito aqui aparece na app sem precisar de nova versão na loja.
 * Os nomes dos campos têm de bater certo com o que a app espera; alterar um nome
 * aqui parte a app silenciosamente.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "boolean"
  | "url";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
};

export type CollectionDef = {
  /** segmento do URL no Outpost */
  key: string;
  /** nome da coleção no Firestore */
  collection: string;
  label: string;
  description: string;
  /** campo usado como título nas listas */
  titleField: string;
  /** campos mostrados na tabela, além do título */
  columns: { name: string; label: string }[];
  /** campos pesquisáveis */
  searchFields: string[];
  fields: Field[];
  /** aviso especial no topo da lista */
  notice?: string;
};

const REGIOES: Field["options"] = [
  { value: "lisboa", label: "Lisboa" },
  { value: "porto", label: "Porto" },
  { value: "braga", label: "Braga" },
  { value: "coimbra", label: "Coimbra" },
  { value: "leiria", label: "Leiria" },
  { value: "aveiro", label: "Aveiro" },
  { value: "faro", label: "Faro" },
  { value: "viseu", label: "Viseu" },
  { value: "outras", label: "Outras regiões" },
  { value: "todas", label: "Todo o país" },
  { value: "online", label: "Online" },
];

const CATEGORIAS_EVENTO: Field["options"] = [
  { value: "natacao", label: "Natação" },
  { value: "yoga", label: "Yoga mãe" },
  { value: "workshop", label: "Workshop" },
  { value: "online", label: "Online" },
  { value: "feira", label: "Feira" },
  { value: "consulta", label: "Consulta" },
  { value: "grupo", label: "Grupo de pais" },
  { value: "familia", label: "Família" },
  { value: "musica", label: "Música" },
  { value: "parto", label: "Preparação para o parto" },
];

export const COLLECTIONS: CollectionDef[] = [
  {
    key: "eventos",
    collection: "events",
    label: "Eventos",
    description:
      "Agenda que aparece no separador Eventos da app. Eventos com data passada deixam de ser mostrados.",
    titleField: "title",
    columns: [
      { name: "isoDate", label: "Data" },
      { name: "region", label: "Região" },
      { name: "category", label: "Categoria" },
    ],
    searchFields: ["title", "local", "desc"],
    notice:
      "A app esconde automaticamente eventos cuja data já passou. Se a lista ficar sem eventos futuros, o separador fica vazio.",
    fields: [
      { name: "title", label: "Título", type: "text", required: true },
      { name: "isoDate", label: "Data", type: "date", required: true, help: "Formato AAAA-MM-DD." },
      { name: "time", label: "Hora", type: "text", placeholder: "10:00" },
      { name: "region", label: "Região", type: "select", options: REGIOES, required: true },
      { name: "category", label: "Categoria", type: "select", options: CATEGORIAS_EVENTO, required: true },
      { name: "emoji", label: "Emoji", type: "text", placeholder: "🏊" },
      { name: "desc", label: "Descrição", type: "textarea" },
      { name: "local", label: "Local", type: "text", placeholder: "Nome e morada" },
      { name: "link", label: "Ligação", type: "url" },
      { name: "isPartner", label: "É de um parceiro", type: "boolean" },
    ],
  },
  {
    key: "parceiros",
    collection: "partners",
    label: "Parceiros",
    description:
      "Marcas e serviços com oferta para os utilizadores. É daqui que vem o desconto que a app mostra.",
    titleField: "name",
    columns: [
      { name: "category", label: "Categoria" },
      { name: "offerCode", label: "Código" },
      { name: "featured", label: "Destaque" },
    ],
    searchFields: ["name", "category", "desc"],
    fields: [
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "category", label: "Categoria", type: "text", placeholder: "Puericultura, farmácia, clínica..." },
      { name: "emoji", label: "Emoji", type: "text" },
      { name: "desc", label: "Descrição", type: "textarea" },
      { name: "url", label: "Site", type: "url" },
      { name: "offerDesc", label: "Descrição da oferta", type: "text", help: "O que o utilizador ganha." },
      { name: "offerCode", label: "Código de desconto", type: "text" },
      { name: "offerPoints", label: "Pontos necessários", type: "number", help: "0 = disponível para todos." },
      { name: "tiered", label: "Oferta em escalões", type: "boolean", help: "Desconto maior para Premium." },
      { name: "offerPremiumCode", label: "Código Premium", type: "text" },
      { name: "featured", label: "Em destaque", type: "boolean" },
      { name: "region", label: "Região", type: "select", options: REGIOES },
    ],
  },
  {
    key: "artigos",
    collection: "articles",
    label: "Artigos",
    description:
      "Conteúdo editorial mostrado na app por idade do bebé ou semana de gravidez.",
    titleField: "title",
    columns: [
      { name: "category", label: "Categoria" },
      { name: "fromMonth", label: "A partir de (meses)" },
    ],
    searchFields: ["title", "body", "category"],
    fields: [
      { name: "title", label: "Título", type: "text", required: true },
      { name: "category", label: "Categoria", type: "text" },
      { name: "emoji", label: "Emoji", type: "text" },
      { name: "summary", label: "Resumo", type: "textarea" },
      { name: "body", label: "Texto", type: "textarea", required: true },
      { name: "fromMonth", label: "A partir de (meses)", type: "number" },
      { name: "toMonth", label: "Até (meses)", type: "number" },
      { name: "partnerId", label: "ID do parceiro", type: "text", help: "Deixa BLApp se for conteúdo próprio." },
      { name: "source", label: "Fonte", type: "text", help: "DGS, SPP, OMS... Dá credibilidade e protege-te." },
    ],
  },
  {
    key: "receitas",
    collection: "recipes",
    label: "Receitas",
    description: "Receitas para bebés, filtradas por idade na app.",
    titleField: "title",
    columns: [
      { name: "fromMonth", label: "A partir de (meses)" },
      { name: "time", label: "Tempo" },
    ],
    searchFields: ["title", "ingredients"],
    fields: [
      { name: "title", label: "Título", type: "text", required: true },
      { name: "emoji", label: "Emoji", type: "text" },
      { name: "fromMonth", label: "A partir de (meses)", type: "number", required: true },
      { name: "time", label: "Tempo de preparação", type: "text", placeholder: "15 min" },
      { name: "ingredients", label: "Ingredientes", type: "textarea", help: "Um por linha." },
      { name: "steps", label: "Preparação", type: "textarea", help: "Um passo por linha." },
      { name: "tags", label: "Etiquetas", type: "text", help: "Separadas por vírgula: SG, VEG, BIO." },
    ],
  },
  {
    key: "locais",
    collection: "places",
    label: "Locais",
    description:
      "Diretório de locais baby-friendly, hospitais e urgências. É o ativo mais forte da app.",
    titleField: "name",
    columns: [
      { name: "type", label: "Tipo" },
      { name: "region", label: "Região" },
      { name: "phone", label: "Telefone" },
    ],
    searchFields: ["name", "addr", "note"],
    notice:
      "Um telefone errado ou um sítio fechado num momento de urgência destrói a confiança. Confirma antes de publicar.",
    fields: [
      { name: "name", label: "Nome", type: "text", required: true },
      // Estes valores são os que existem mesmo nos 999 registos do Firestore.
      // Inventar um valor novo aqui faz o local desaparecer dos filtros da app.
      { name: "type", label: "Tipo", type: "select", required: true, options: [
        { value: "hospital", label: "Hospital" },
        { value: "urgencia", label: "Urgência pediátrica" },
        { value: "clinica", label: "Clínica" },
        { value: "farmacia", label: "Farmácia" },
        { value: "creche", label: "Creche" },
        { value: "ama", label: "Ama" },
        { value: "apoio", label: "Apoio a famílias" },
        { value: "parque", label: "Parque" },
        { value: "praia", label: "Praia" },
        { value: "piscina", label: "Piscina" },
        { value: "ginasio", label: "Ginásio" },
        { value: "cultura", label: "Cultura" },
        { value: "cafe", label: "Café" },
        { value: "restaurante", label: "Restaurante" },
        { value: "hotel", label: "Hotel" },
        { value: "loja", label: "Loja" },
      ] },
      { name: "region", label: "Região", type: "select", options: REGIOES, required: true },
      { name: "addr", label: "Morada", type: "text" },
      { name: "phone", label: "Telefone", type: "text" },
      { name: "lat", label: "Latitude", type: "number" },
      { name: "lng", label: "Longitude", type: "number" },
      { name: "emoji", label: "Emoji", type: "text" },
      { name: "note", label: "Nota", type: "textarea", help: "O que torna o sítio adequado a famílias." },
    ],
  },
];

export function collectionByKey(key: string): CollectionDef | undefined {
  return COLLECTIONS.find((c) => c.key === key);
}
