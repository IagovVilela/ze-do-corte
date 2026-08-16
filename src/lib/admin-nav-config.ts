import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BarChart3,
  Building2,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  Contact,
  ScrollText,
  CreditCard,
  Globe2,
  LayoutDashboard,
  LineChart,
  MessageCircle,
  Package,
  Palette,
  PiggyBank,
  Receipt,
  Scissors,
  Settings,
  Sparkles,
  Star,
  TrendingUp,
  UserCircle,
  Users,
  Wallet,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";

import type { StaffAccess } from "@/lib/staff-access";

export type AdminNavFilterId =
  | "all"
  | "overview"
  | "operation"
  | "finance"
  | "brand"
  | "account";

export type AdminNavItem = {
  href: string;
  label: string;
  show: boolean;
  badge?: string | null;
  /** Termos extras para a busca (sinônimos do Cash Barber / uso diário). */
  keywords?: string[];
  icon: LucideIcon;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  filter: Exclude<AdminNavFilterId, "all">;
  /** Subtítulo curto sob o título do grupo. */
  hint?: string;
  defaultOpen?: boolean;
  items: AdminNavItem[];
};

export const ADMIN_NAV_FILTERS: {
  id: AdminNavFilterId;
  label: string;
}[] = [
  { id: "all", label: "Tudo" },
  { id: "overview", label: "Visão" },
  { id: "operation", label: "Operação" },
  { id: "finance", label: "Financeiro" },
  { id: "brand", label: "Marca" },
  { id: "account", label: "Conta" },
];

export function buildAdminNavGroups(
  access: StaffAccess,
  proUnlocked: boolean,
): AdminNavGroup[] {
  if (access.role === "SUPPORT_ASSIST") {
    const allow = new Set([
      "/admin",
      "/admin/operacional",
      "/admin/avaliacoes",
      "/admin/agendamentos",
      "/admin/clientes",
      "/admin/clube",
      "/admin/site",
      "/admin/whatsapp",
    ]);
    return buildAdminNavGroupsForRoles(
      { ...access, role: "OWNER" },
      proUnlocked,
    )
      .map((g) => ({
        ...g,
        items: g.items
          .map((i) => ({ ...i, show: allow.has(i.href) }))
          .filter((i) => i.show),
      }))
      .filter((g) => g.items.length > 0);
  }
  return buildAdminNavGroupsForRoles(access, proUnlocked);
}

function buildAdminNavGroupsForRoles(
  access: StaffAccess,
  proUnlocked: boolean,
): AdminNavGroup[] {
  const ownerOrAdmin = access.role === "OWNER" || access.role === "ADMIN";

  return [
    {
      id: "overview",
      label: "Visão geral",
      filter: "overview",
      hint: "Acompanhe o salão",
      defaultOpen: true,
      items: [
        {
          href: "/admin",
          label: "Painel",
          show: true,
          icon: LayoutDashboard,
          keywords: ["dashboard", "home", "início", "inicio", "visão geral"],
        },
        {
          href: "/admin/operacional",
          label: "Operacional",
          show: true,
          icon: ClipboardList,
          keywords: ["fila", "hoje", "tarefas", "a fazer"],
        },
        {
          href: "/admin/avaliacoes",
          label: "Avaliações",
          show: true,
          icon: Star,
          keywords: [
            "feedback",
            "review",
            "estrelas",
            "comentários",
            "comentarios",
            "nota",
          ],
        },
        {
          href: "/admin/relatorios",
          label: "Relatórios",
          show: ownerOrAdmin,
          icon: BarChart3,
          keywords: ["gráficos", "indicadores", "analytics"],
        },
        {
          href: "/admin/inteligencia",
          label: "Braço Direito",
          show: ownerOrAdmin,
          icon: Sparkles,
          keywords: [
            "ia",
            "inteligência",
            "inteligencia",
            "análise",
            "analise",
            "consultor",
            "insights",
            "braço",
            "braco",
          ],
        },
        {
          href: "/admin/evolucao",
          label: "Evolução",
          show: ownerOrAdmin,
          icon: TrendingUp,
          keywords: [
            "crescimento",
            "faturamento consolidado",
            "retorno",
            "taxa",
            "monitorar",
          ],
        },
      ],
    },
    {
      id: "operation",
      label: "Operação",
      filter: "operation",
      hint: "Agenda e cadastros",
      defaultOpen: true,
      items: [
        {
          href: "/admin/agendamentos",
          label: "Agendamentos",
          show: true,
          icon: CalendarDays,
          keywords: ["agenda", "calendário", "calendario", "comanda", "horários"],
        },
        {
          href: "/admin/clientes",
          label: "Clientes",
          show: true,
          icon: Contact,
          keywords: [
            "crm",
            "telefone",
            "whatsapp",
            "histórico",
            "historico",
            "base",
            "fidelidade",
          ],
        },
        {
          href: "/admin/unidades",
          label: "Unidades",
          show: access.permissions.manageUnits,
          icon: Building2,
          keywords: ["filial", "filiais", "loja"],
        },
        {
          href: "/admin/equipe",
          label: "Equipe",
          show: access.permissions.manageStaff !== "none",
          icon: Users,
          keywords: ["barbeiros", "funcionários", "funcionarios", "staff"],
        },
        {
          href: "/admin/servicos",
          label: "Serviços",
          show: access.permissions.manageServices,
          icon: Scissors,
          keywords: ["corte", "barba", "preço", "preco", "duração"],
        },
        {
          href: "/admin/produtos",
          label: "Produtos",
          show: ownerOrAdmin,
          icon: Package,
          keywords: ["estoque", "venda", "pomada", "loja"],
        },
        {
          href: "/admin/expediente",
          label: "Meu expediente",
          show: access.role === "STAFF",
          icon: Clock,
          keywords: ["horário", "horario", "trabalho", "folga"],
        },
      ],
    },
    {
      id: "finance-daily",
      label: "Financeiro · dia a dia",
      filter: "finance",
      hint: "Caixa e contas",
      defaultOpen: false,
      items: [
        {
          href: "/admin/caixa",
          label: "Caixa",
          show: access.permissions.viewRevenue,
          badge: proUnlocked ? null : "Pro",
          icon: Wallet,
          keywords: ["recebimentos", "pagos", "dinheiro"],
        },
        {
          href: "/admin/financeiro/contas-a-pagar",
          label: "Contas a pagar",
          show: access.permissions.viewRevenue,
          icon: ArrowDownCircle,
          keywords: ["despesas", "pagar", "fornecedor"],
        },
        {
          href: "/admin/financeiro/contas-a-receber",
          label: "Contas a receber",
          show: access.permissions.viewRevenue,
          icon: ArrowUpCircle,
          keywords: ["receitas", "receber", "a prazo"],
        },
        {
          href: "/admin/financeiro/criar-despesa",
          label: "Criar despesa",
          show: access.permissions.viewRevenue,
          icon: Receipt,
          keywords: ["gasto", "lançamento", "lancamento", "nova despesa"],
        },
        {
          href: "/admin/financeiro/criar-receita",
          label: "Criar receita",
          show: access.permissions.viewRevenue,
          icon: Banknote,
          keywords: ["entrada", "lançamento", "lancamento", "nova receita"],
        },
      ],
    },
    {
      id: "finance-analysis",
      label: "Financeiro · análise",
      filter: "finance",
      hint: "Comissões e balanço",
      defaultOpen: false,
      items: [
        {
          href: "/admin/financeiro/comissoes",
          label: "Comissões",
          show: access.permissions.viewRevenue,
          icon: PiggyBank,
          keywords: ["pagamento", "pote", "barbeiro", "vale", "bônus"],
        },
        {
          href: "/admin/financeiro/balanco",
          label: "Balanço",
          show: access.permissions.viewRevenue,
          icon: LineChart,
          keywords: ["saldo", "resultado", "lucro"],
        },
      ],
    },
    {
      id: "finance-billing",
      label: "Cobrança & plano",
      filter: "finance",
      hint: "PIX, clube e assinatura",
      defaultOpen: false,
      items: [
        {
          href: "/admin/pagamentos",
          label: "Pagamentos",
          show: access.role === "OWNER" || access.permissions.manageSettings,
          icon: CreditCard,
          keywords: ["asaas", "pix", "gateway", "api"],
        },
        {
          href: "/admin/clube",
          label: "Clube",
          show: access.permissions.manageSubscriptions,
          badge: proUnlocked ? null : "Pro",
          icon: Users,
          keywords: ["assinatura", "mensalidade", "sócio", "socio"],
        },
        {
          href: "/admin/plano",
          label: "Plano Barbernegon",
          show: access.role === "OWNER",
          icon: CreditCard,
          keywords: ["saas", "pro", "free", "assinatura plataforma"],
        },
      ],
    },
    {
      id: "brand",
      label: "Marca & presença",
      filter: "brand",
      hint: "Site e WhatsApp",
      defaultOpen: false,
      items: [
        {
          href: "/admin/marca",
          label: "Marca",
          show: access.permissions.manageBranding,
          icon: Palette,
          keywords: ["logo", "cores", "identidade", "slug"],
        },
        {
          href: "/admin/site",
          label: "Site",
          show: access.permissions.manageBranding,
          icon: Globe2,
          keywords: ["canvas", "página", "pagina", "landing"],
        },
        {
          href: "/admin/whatsapp",
          label: "WhatsApp",
          show: access.permissions.manageBranding,
          icon: MessageCircle,
          keywords: ["bot", "meta", "mensagem"],
        },
      ],
    },
    {
      id: "account",
      label: "Conta",
      filter: "account",
      hint: "Você e o sistema",
      defaultOpen: false,
      items: [
        {
          href: "/admin/perfil",
          label: "Perfil",
          show: true,
          icon: UserCircle,
          keywords: ["foto", "senha", "meu"],
        },
        {
          href: "/admin/configuracao",
          label: "Configuração",
          show: true,
          icon: Settings,
          keywords: ["tema", "preferências", "preferencias"],
        },
        {
          href: "/admin/condicoes",
          label: "Condições",
          show: true,
          icon: ScrollText,
          keywords: [
            "pdf",
            "termos",
            "privacidade",
            "informativo",
            "asaas",
            "whatsapp",
          ],
        },
        {
          href: "/admin/suporte",
          label: "Suporte",
          show: true,
          icon: CircleHelp,
          keywords: ["ajuda", "chamado", "ticket"],
        },
      ],
    },
  ];
}

export function normalizeNavSearch(q: string): string {
  return q
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function navItemMatchesQuery(
  item: Pick<AdminNavItem, "label" | "keywords" | "href">,
  query: string,
): boolean {
  const q = normalizeNavSearch(query);
  if (!q) return true;
  const hay = normalizeNavSearch(
    [item.label, item.href, ...(item.keywords ?? [])].join(" "),
  );
  return q.split(/\s+/).every((part) => hay.includes(part));
}

/** Match ativo: href mais específico vence (evita /admin marcar tudo). */
export function isAdminNavItemActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
