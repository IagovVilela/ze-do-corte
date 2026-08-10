import "server-only";

import { endOfMonth, startOfDay, startOfMonth, subDays } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { appointmentListWhere } from "@/lib/admin-appointment-list-where";
import { getAdminCrmSnapshot } from "@/lib/admin-crm";
import { getAdminOpsSnapshot } from "@/lib/admin-ops";
import { BARBER_TIMEZONE } from "@/lib/constants";
import {
  buildClubHealthBuckets,
  type ClubHealthBucket,
} from "@/lib/club-health";
import { prisma } from "@/lib/prisma";
import type { StaffAccess } from "@/lib/staff-access";
import type { WhatsAppDraftKind } from "@/lib/whatsapp-draft-types";

export type MorningBriefingTone = "urgent" | "attention" | "positive";

export type MorningBriefingKind =
  | "agenda"
  | "cash"
  | "retention"
  | "club"
  | "stock"
  | "goals"
  | "positive";

export type MorningBriefingCard = {
  id: string;
  kind: MorningBriefingKind;
  tone: MorningBriefingTone;
  title: string;
  detail: string;
  href: string;
  cta: string;
  /** Maior = mais prioritário. */
  score: number;
  /** CTA secundário: gerar mensagem WhatsApp (IA ou regras). */
  draftAction?: {
    kind: WhatsAppDraftKind;
    clientName: string;
    phone: string;
    daysSinceLastActivity?: number | null;
    planName?: string | null;
    lastServiceHint?: string | null;
  };
};

export type MorningBriefingPrimaryAction = {
  label: string;
  href: string;
};

export type MorningBriefingFacts = {
  generatedAt: string;
  organizationId: string;
  timezone: string;
  kpis: {
    todayConfirmed: number;
    nextTwoHours: number;
    unpaidCount: number;
    unpaidTotal: number;
    clubPastDue: number;
    lostClients: number;
    atRiskClients: number;
    lowStockCount: number;
    receivedLast7d: number;
    receivedPrev7d: number;
    receivedDeltaPercent: number | null;
  };
  clubBuckets: { key: string; label: string; count: number }[];
  topClientHint: string | null;
  goals: {
    yearMonth: string;
    behindCount: number;
    topHint: string | null;
  };
};

export type AdminMorningBriefing = {
  greeting: string;
  subtitle: string;
  cards: MorningBriefingCard[];
  primaryAction: MorningBriefingPrimaryAction | null;
  /** JSON fechado para narrativa IA — sem PII de telefone. */
  facts: MorningBriefingFacts;
};

function money(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function greetingForHour(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0 && current <= 0) return null;
  if (previous <= 0) return 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function primaryFromTopCard(
  card: MorningBriefingCard | undefined,
): MorningBriefingPrimaryAction | null {
  if (!card) return null;
  switch (card.kind) {
    case "cash":
      return { label: "Faça agora: registrar a receber", href: card.href };
    case "retention":
      return card.draftAction?.phone
        ? {
            label: `Faça agora: WhatsApp — ${card.draftAction.clientName.split(/\s+/)[0]}`,
            href: card.href,
          }
        : { label: "Faça agora: reativar no CRM", href: card.href };
    case "club":
      return { label: "Faça agora: falar com o clube", href: card.href };
    case "agenda":
      return { label: "Faça agora: conferir agenda", href: card.href };
    case "stock":
      return { label: "Faça agora: checar estoque", href: card.href };
    case "goals":
      return { label: "Faça agora: ver metas da equipe", href: card.href };
    case "positive":
      return { label: card.cta, href: card.href };
    default: {
      const _n: never = card.kind;
      return _n;
    }
  }
}

/**
 * Briefing matinal ranqueado para OWNER/ADMIN.
 * STAFF recebe `null` (sem receita/clube sensível no ritual do dono).
 */
export async function getAdminMorningBriefing(
  access: StaffAccess,
): Promise<AdminMorningBriefing | null> {
  if (access.role !== "OWNER" && access.role !== "ADMIN") {
    return null;
  }

  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
    select: { timezone: true, name: true },
  });
  const tz = org?.timezone?.trim() || BARBER_TIMEZONE;
  const now = new Date();
  const zNow = toZonedTime(now, tz);
  const hour = zNow.getHours();
  const yearMonth = `${zNow.getFullYear()}-${String(zNow.getMonth() + 1).padStart(2, "0")}`;
  const monthFrom = fromZonedTime(startOfMonth(zNow), tz);
  const monthTo = fromZonedTime(endOfMonth(zNow), tz);

  const weekStart = fromZonedTime(startOfDay(subDays(zNow, 6)), tz);
  const weekEnd = now;
  const prevWeekStart = fromZonedTime(startOfDay(subDays(zNow, 13)), tz);
  const prevWeekEnd = weekStart;

  const whereBase = appointmentListWhere(access, {});
  const canRevenue = access.permissions.viewRevenue;

  // Sequencial em ondas: ops sozinho já usa várias queries; em paralelo com CRM
  // estoura o pool (timeout "when trying to connect").
  const ops = await getAdminOpsSnapshot(access);
  const [crm, clubSubs] = await Promise.all([
    getAdminCrmSnapshot(access, {
      riskFilter: "actionable",
      sort: "risk",
      page: 1,
      pageSize: 8,
    }),
    prisma.clientSubscription.findMany({
      where: { organizationId: access.organizationId },
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        status: true,
        currentPeriodEnd: true,
        visitsUsed: true,
        plan: { select: { name: true, visitsIncluded: true } },
      },
      take: 800,
    }),
  ]);
  const [paidLast, paidPrev] = canRevenue
    ? await Promise.all([
        prisma.appointment.findMany({
          where: {
            AND: [
              whereBase,
              { paidAt: { gte: weekStart, lte: weekEnd } },
              { status: "COMPLETED" },
            ],
          },
          select: {
            amountPaid: true,
            service: { select: { price: true } },
          },
          take: 2000,
        }),
        prisma.appointment.findMany({
          where: {
            AND: [
              whereBase,
              { paidAt: { gte: prevWeekStart, lt: prevWeekEnd } },
              { status: "COMPLETED" },
            ],
          },
          select: {
            amountPaid: true,
            service: { select: { price: true } },
          },
          take: 2000,
        }),
      ])
    : [[], []];

  // Metas em segundo lote — reduz pico de conexões no pool pg.
  const [staffGoals, paidForGoals] = canRevenue
    ? await Promise.all([
        prisma.staffMonthlyGoal.findMany({
          where: {
            organizationId: access.organizationId,
            yearMonth,
          },
          include: {
            staffMember: {
              select: { displayName: true, email: true },
            },
          },
        }),
        prisma.appointment.findMany({
          where: {
            unit: { organizationId: access.organizationId },
            paidAt: { gte: monthFrom, lte: monthTo },
            status: { in: ["CONFIRMED", "COMPLETED"] },
            staffMemberId: { not: null },
          },
          select: {
            staffMemberId: true,
            amountPaid: true,
            service: { select: { price: true } },
            items: { select: { price: true } },
            products: { select: { quantity: true, unitPrice: true } },
          },
          take: 4000,
        }),
      ])
    : [[], []];

  const sumPaid = (
    rows: { amountPaid: unknown; service: { price: unknown } }[],
  ) =>
    rows.reduce((s, r) => {
      const v =
        r.amountPaid != null ? Number(r.amountPaid) : Number(r.service.price);
      return s + (Number.isFinite(v) ? v : 0);
    }, 0);

  const receivedLast7d = Math.round(sumPaid(paidLast) * 100) / 100;
  const receivedPrev7d = Math.round(sumPaid(paidPrev) * 100) / 100;
  const receivedDeltaPercent = canRevenue
    ? pctDelta(receivedLast7d, receivedPrev7d)
    : null;

  const unpaidTotal =
    Math.round(ops.unpaid.reduce((s, u) => s + u.amount, 0) * 100) / 100;

  const revenueByStaff = new Map<string, number>();
  for (const a of paidForGoals) {
    const id = a.staffMemberId;
    if (!id) continue;
    const service =
      a.amountPaid != null
        ? Number(a.amountPaid)
        : Number(a.service.price) +
          a.items.reduce((s, i) => s + Number(i.price), 0);
    const products = a.products.reduce(
      (s, p) => s + Number(p.unitPrice) * p.quantity,
      0,
    );
    revenueByStaff.set(id, (revenueByStaff.get(id) ?? 0) + service + products);
  }

  type GoalProg = {
    name: string;
    progress: number;
    revenueGoal: number;
  };
  const goalProgress: GoalProg[] = [];
  for (const g of staffGoals) {
    const goal = Number(g.revenueGoal);
    if (!Number.isFinite(goal) || goal <= 0) continue;
    const rev = revenueByStaff.get(g.staffMemberId) ?? 0;
    const progress = Math.round((rev / goal) * 1000) / 10;
    const name =
      g.staffMember.displayName?.trim() ||
      g.staffMember.email.split("@")[0] ||
      "Profissional";
    goalProgress.push({ name, progress, revenueGoal: goal });
  }
  goalProgress.sort((a, b) => a.progress - b.progress);
  const behindGoals = goalProgress.filter((g) => g.progress < 70);
  const worstGoal = goalProgress[0] ?? null;

  const clubBuckets: ClubHealthBucket[] = buildClubHealthBuckets(clubSubs, now);
  const pastDueBucket = clubBuckets.find((b) => b.key === "pastDue");
  const underuseBucket = clubBuckets.find((b) => b.key === "underuse");
  const churnBucket = clubBuckets.find((b) => b.key === "churnRisk");

  const cards: MorningBriefingCard[] = [];

  if (ops.kpis.nextTwoHours > 0) {
    cards.push({
      id: "agenda-2h",
      kind: "agenda",
      tone: "urgent",
      title: `${ops.kpis.nextTwoHours} atendimento${ops.kpis.nextTwoHours === 1 ? "" : "s"} nas próximas 2 horas`,
      detail: "Confira profissional, sala e pontualidade antes da fila esquentar.",
      href: "/admin/agendamentos",
      cta: "Ver agenda",
      score: 100 + ops.kpis.nextTwoHours,
    });
  } else if (ops.kpis.todayConfirmed > 0) {
    cards.push({
      id: "agenda-today",
      kind: "agenda",
      tone: "attention",
      title: `${ops.kpis.todayConfirmed} confirmado${ops.kpis.todayConfirmed === 1 ? "" : "s"} hoje`,
      detail: "Revise a agenda do dia e atribua profissionais se ainda faltarem.",
      href: "/admin/agendamentos",
      cta: "Abrir agenda",
      score: 55 + ops.kpis.todayConfirmed,
    });
  }

  if (canRevenue && ops.kpis.unpaidCompleted > 0) {
    const n = ops.kpis.unpaidCompleted;
    cards.push({
      id: "cash-unpaid",
      kind: "cash",
      tone: "urgent",
      title:
        unpaidTotal > 0
          ? `${money(unpaidTotal)} a receber (${n} comanda${n === 1 ? "" : "s"})`
          : `${n} comanda${n === 1 ? "" : "s"} sem pagamento`,
      detail:
        "Atendimentos já concluídos sem registro de pagamento. Registre PIX, dinheiro ou cartão na hora.",
      href: "/admin/operacional#a-receber",
      cta: "Registrar pagamentos",
      score: 90 + Math.min(50, unpaidTotal / 20) + n,
    });
  }

  const lost = crm.lostCount || ops.lostClientsCount;
  const atRisk = crm.atRiskCount ?? 0;
  if (lost + atRisk > 0) {
    const parts: string[] = [];
    if (lost > 0) parts.push(`${lost} sumindo`);
    if (atRisk > 0) parts.push(`${atRisk} em risco`);
    const first = crm.actionQueue[0];
    cards.push({
      id: "retention",
      kind: "retention",
      tone: lost > 0 ? "urgent" : "attention",
      title: `${parts.join(" · ")} — reative pelo WhatsApp`,
      detail: first
        ? `Fila pronta: comece por ${first.name}.`
        : "Abra o CRM e mande a mensagem de retorno antes de perder o cliente.",
      href:
        lost > 0 ? "/admin/clientes?risk=lost" : "/admin/clientes?risk=at_risk",
      cta: "Abrir CRM",
      score: 80 + lost * 2 + atRisk,
      draftAction: first
        ? {
            kind: "winback",
            clientName: first.name,
            phone: first.phone,
            daysSinceLastActivity: first.daysSinceLastActivity,
            planName: first.clubPlanName,
            lastServiceHint: first.lastServiceName,
          }
        : undefined,
    });
  }

  const clubAttentionCount =
    (pastDueBucket?.count ?? ops.kpis.clubPastDue) +
    (churnBucket?.count ?? 0);
  if (clubAttentionCount > 0) {
    const pastItem = pastDueBucket?.items[0];
    const churnItem = churnBucket?.items[0];
    const lead = pastItem ?? churnItem;
    const sub = clubSubs.find((s) => s.id === lead?.id);
    cards.push({
      id: "club-risk",
      kind: "club",
      tone: "attention",
      title: `${clubAttentionCount} assinatura${clubAttentionCount === 1 ? "" : "s"} do clube pedem atenção`,
      detail:
        (pastDueBucket?.count ?? 0) > 0
          ? "Há inadimplência — regularize ou pause antes do churn."
          : "Renovação próxima ou risco de cancelamento — fale com o assinante.",
      href: "/admin/clube",
      cta: "Ver clube",
      score: 75 + clubAttentionCount * 3,
      draftAction:
        lead && sub
          ? {
              kind: pastItem ? "club_past_due" : "club_churn",
              clientName: lead.clientName,
              phone: sub.clientPhone,
              planName: sub.plan.name,
            }
          : undefined,
    });
  } else if ((underuseBucket?.count ?? 0) >= 3) {
    const lead = underuseBucket!.items[0];
    const sub = clubSubs.find((s) => s.id === lead?.id);
    cards.push({
      id: "club-underuse",
      kind: "club",
      tone: "attention",
      title: `${underuseBucket!.count} assinantes pouco usam o plano`,
      detail: "Lembrete amigável aumenta retenção e percepção de valor do clube.",
      href: "/admin/clube",
      cta: "Saúde do clube",
      score: 62 + underuseBucket!.count,
      draftAction:
        lead && sub
          ? {
              kind: "club_underuse",
              clientName: lead.clientName,
              phone: sub.clientPhone,
              planName: sub.plan.name,
            }
          : undefined,
    });
  }

  if (ops.lowStock.length > 0) {
    const first = ops.lowStock[0]!;
    cards.push({
      id: "stock",
      kind: "stock",
      tone: "attention",
      title:
        ops.lowStock.length === 1
          ? `${first.name} abaixo do estoque mínimo`
          : `${ops.lowStock.length} produtos abaixo do mínimo`,
      detail: `${first.name}: ${first.stockQty} un. (mín. ${first.stockMin ?? 3}).`,
      href: "/admin/produtos",
      cta: "Ver estoque",
      score: 70 + ops.lowStock.length * 2,
    });
  }

  if (canRevenue && worstGoal && behindGoals.length > 0) {
    cards.push({
      id: "goals-behind",
      kind: "goals",
      tone: worstGoal.progress < 40 ? "urgent" : "attention",
      title: `${worstGoal.name} em ${worstGoal.progress}% da meta do mês`,
      detail:
        behindGoals.length === 1
          ? `Meta ${money(worstGoal.revenueGoal)} — acelere agenda e ticket.`
          : `${behindGoals.length} profissionais abaixo de 70% da meta de receita.`,
      href: "/admin/financeiro/comissoes",
      cta: "Ver metas",
      score: 68 + Math.max(0, 70 - worstGoal.progress) / 2,
    });
  }

  if (
    canRevenue &&
    receivedDeltaPercent != null &&
    receivedDeltaPercent >= 8 &&
    receivedLast7d > 0
  ) {
    cards.push({
      id: "positive-revenue",
      kind: "positive",
      tone: "positive",
      title: `Recebido nos últimos 7 dias ${receivedDeltaPercent > 0 ? "+" : ""}${receivedDeltaPercent}% vs semana anterior`,
      detail: `${money(receivedLast7d)} no período — ritmo acima do anterior.`,
      href: "/admin/relatorios",
      cta: "Ver relatórios",
      score: 42 + Math.min(20, receivedDeltaPercent / 2),
    });
  } else if (
    canRevenue &&
    receivedDeltaPercent != null &&
    receivedDeltaPercent <= -12 &&
    receivedPrev7d > 0
  ) {
    cards.push({
      id: "cash-down",
      kind: "cash",
      tone: "attention",
      title: `Recebido 7d caiu ${Math.abs(receivedDeltaPercent)}% vs semana anterior`,
      detail: `${money(receivedLast7d)} agora · ${money(receivedPrev7d)} antes. Vale olhar agenda e conversão.`,
      href: "/admin/relatorios",
      cta: "Investigar",
      score: 72 + Math.min(25, Math.abs(receivedDeltaPercent) / 2),
    });
  }

  if (ops.topClients.length > 0) {
    const top = ops.topClients[0]!;
    cards.push({
      id: "positive-loyalty",
      kind: "positive",
      tone: "positive",
      title: `${top.name} lidera recorrência no mês (${top.visits} visitas)`,
      detail: "Clientes fiéis sustentam o caixa — reconheça e incentive indicação.",
      href: "/admin/clientes",
      cta: "Ver clientes",
      score: 38 + Math.min(15, top.visits),
    });
  }

  if (ops.kpis.todayConfirmed === 0 && cards.every((c) => c.kind !== "agenda")) {
    cards.push({
      id: "agenda-empty",
      kind: "agenda",
      tone: "attention",
      title: "Nenhum horário confirmado para hoje",
      detail: "Use o site, WhatsApp ou a recepção para encher a agenda.",
      href: "/admin/agendamentos",
      cta: "Abrir agenda",
      score: 50,
    });
  }

  cards.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "pt-BR"));
  const topCards = cards.slice(0, 5);

  const shopName = org?.name?.trim() || "sua barbearia";

  const facts: MorningBriefingFacts = {
    generatedAt: now.toISOString(),
    organizationId: access.organizationId,
    timezone: tz,
    kpis: {
      todayConfirmed: ops.kpis.todayConfirmed,
      nextTwoHours: ops.kpis.nextTwoHours,
      unpaidCount: ops.kpis.unpaidCompleted,
      unpaidTotal,
      clubPastDue: ops.kpis.clubPastDue,
      lostClients: crm.lostCount || ops.lostClientsCount,
      atRiskClients: crm.atRiskCount ?? 0,
      lowStockCount: ops.lowStock.length,
      receivedLast7d,
      receivedPrev7d,
      receivedDeltaPercent,
    },
    clubBuckets: clubBuckets.map((b) => ({
      key: b.key,
      label: b.label,
      count: b.count,
    })),
    topClientHint:
      ops.topClients[0] != null
        ? `${ops.topClients[0].visits} visitas no mês (primeiro da lista)`
        : null,
    goals: {
      yearMonth,
      behindCount: behindGoals.length,
      topHint: worstGoal
        ? `${worstGoal.name} em ${worstGoal.progress}% da meta`
        : null,
    },
  };

  const urgentCount = topCards.filter((c) => c.tone === "urgent").length;
  const subtitle =
    topCards.length === 0
      ? `${shopName} está em dia — nada crítico na fila agora.`
      : urgentCount > 0
        ? `${urgentCount} prioridade${urgentCount === 1 ? "" : "s"} urgente${urgentCount === 1 ? "" : "s"} · foque nas ações abaixo.`
        : `Até ${topCards.length} ponto${topCards.length === 1 ? "" : "s"} de atenção para manter o controle do dia.`;

  return {
    greeting: `${greetingForHour(hour)} — foco de hoje`,
    subtitle,
    cards: topCards,
    primaryAction: primaryFromTopCard(topCards[0]),
    facts,
  };
}
