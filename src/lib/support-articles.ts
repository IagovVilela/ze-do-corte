export type SupportArticleCategory =
  | "site"
  | "agenda"
  | "whatsapp"
  | "payments"
  | "club"
  | "billing";

export type SupportArticle = {
  slug: string;
  title: string;
  category: SupportArticleCategory;
  summary: string;
  /** Parágrafos curtos em português simples. */
  body: string[];
};

export const SUPPORT_ARTICLE_CATEGORY_LABEL: Record<
  SupportArticleCategory,
  string
> = {
  site: "Site",
  agenda: "Agenda",
  whatsapp: "WhatsApp",
  payments: "Pagamentos",
  club: "Clube",
  billing: "Plano Barbernegon",
};

export const SUPPORT_ARTICLES: SupportArticle[] = [
  {
    slug: "site-marca",
    title: "Como deixar o site com a cara da barbearia",
    category: "site",
    summary: "Logo, cores e textos em Marca; layout no editor do Site.",
    body: [
      "Em /admin/marca você define nome, logo, cores, slogans e redes. Isso aparece no site público da sua barbearia.",
      "Em /admin/site o editor visual (tipo Canva) monta as seções: hero, serviços, equipe, contato. Use um template e ajuste.",
      "Quando terminar, publique as alterações. O endereço público fica em barbernegon.com/seu-slug (ou o domínio da plataforma).",
    ],
  },
  {
    slug: "agenda-online",
    title: "Como funciona o agendamento online",
    category: "agenda",
    summary: "Cliente marca no site; você gerencia no painel.",
    body: [
      "Cadastre serviços e equipe nas telas de Serviços e Equipe. Defina o expediente para os horários aparecerem corretos.",
      "O cliente acessa /seu-slug/agendar, escolhe serviço, profissional, dia e horário. A reserva entra no painel.",
      "O cliente pode remarcar ou cancelar pelo link da reserva. Você também gerencia tudo em /admin (visão geral).",
    ],
  },
  {
    slug: "whatsapp-numero",
    title: "Número de WhatsApp no site",
    category: "whatsapp",
    summary: "O essencial: um número com DDD para o botão do site.",
    body: [
      "Em /admin/whatsapp digite o número da barbearia (com DDD) e salve.",
      "Isso atualiza o botão de WhatsApp do site (link wa.me). Quase todo salão precisa só disso.",
    ],
  },
  {
    slug: "whatsapp-assistente",
    title: "Assistente que agenda pelo WhatsApp",
    category: "whatsapp",
    summary: "Robô oficial da Meta; precisa de códigos especiais.",
    body: [
      "O assistente responde no WhatsApp e marca horário sozinho. Não basta o número do celular: a Meta exige Phone number ID e access token.",
      "Na mesma tela /admin/whatsapp, abra as opções do assistente só se você (ou o suporte Barbernegon) já tiver esses códigos.",
      "Sem os códigos, use só o número no site. O assistente pode ser ligado depois — abra um chamado em Suporte se precisar de ajuda.",
    ],
  },
  {
    slug: "pagamentos-asaas",
    title: "Como o dinheiro chega no seu banco",
    category: "payments",
    summary: "PIX e clube caem na sua conta Asaas; depois você saca.",
    body: [
      "O cliente paga PIX no site (ou a assinatura do Clube). O valor cai na conta Asaas da sua barbearia — não na Barbernegon.",
      "No Asaas você cadastra a conta bancária e faz o saque/transferência para o banco de sempre.",
      "Passos: criar conta em asaas.com → cadastrar banco → copiar a API key → colar em /admin/pagamentos → marcar “Quero receber online” → salvar.",
    ],
  },
  {
    slug: "clube-assinaturas",
    title: "Clube de assinaturas dos clientes",
    category: "club",
    summary: "Planos recorrentes (Pro ou trial). Dinheiro no Asaas do salão.",
    body: [
      "O Clube fica em /admin/clube (plano Pro ou trial ativo). Crie planos com preço e ciclo.",
      "O cliente pode assinar sozinho em /seu-slug/clube (PIX ou cartão) ou você vincula no balcão.",
      "Pagamento confirmado ativa a assinatura. Você pode pausar, reativar, postergar ou cancelar pelo painel.",
    ],
  },
  {
    slug: "plano-saas",
    title: "Planos Free e Pro da Barbernegon",
    category: "billing",
    summary: "Mensalidade da plataforma (separada do dinheiro dos seus clientes).",
    body: [
      "Free (grátis para sempre): site, agenda, painel, PIX, WhatsApp, marketplace, até 2 barbeiros e 1 unidade. Pro (R$ 129): tudo isso + Caixa + Clube + barbeiros ilimitados + várias unidades.",
      "Cadastro inclui 1 mês de Pro grátis (3 meses na oferta de lançamento). Depois você fica no Free — assinar Pro é opcional. Em /admin/plano o dono gerencia o plano (PIX ou cartão).",
      "Essa cobrança é da Barbernegon. O PIX/clube dos seus clientes continua na sua conta Asaas.",
    ],
  },
];

export function getSupportArticle(slug: string): SupportArticle | undefined {
  return SUPPORT_ARTICLES.find((a) => a.slug === slug);
}
