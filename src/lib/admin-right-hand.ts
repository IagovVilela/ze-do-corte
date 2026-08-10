import "server-only";

import { differenceInCalendarDays, getISODay, startOfISOWeek, subDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { getAppointmentFrequencyHeatmap } from "@/lib/admin-appointment-frequency";
import type { AppointmentFrequencyHeatmap } from "@/lib/admin-appointment-frequency-types";
import { getAdminCrmSnapshot } from "@/lib/admin-crm";
import { getAdminReportsSnapshot } from "@/lib/admin-reports";
import { appointmentListWhere } from "@/lib/admin-appointment-list-where";
import type {
  RightHandCompareMetric,
  RightHandFacts,
  RightHandMaturity,
  RightHandPrediction,
  RightHandPromoSuggestion,
  RightHandRetentionClient,
  RightHandSnapshot,
} from "@/lib/admin-right-hand-types";
import { BARBER_TIMEZONE } from "@/lib/constants";
import {
  getDashboardPeriodMeta,
  type DashboardRange,
} from "@/lib/dashboard-period";
import { prisma } from "@/lib/prisma";
import {
  aggregatePeriodMetrics,
  appointmentsSubtitle,
  averageHistoricalLtv,
  computeReturnCohorts,
  findPeakValley,
  pctDelta,
  pointsDelta,
  predictWeekdayDemand,
  type MetricAppointmentRow,
} from "@/lib/right-hand-metrics";
import type { StaffAccess } from "@/lib/staff-access";

export type {
  RightHandCompareMetric,
  RightHandFacts,
  RightHandMaturity,
  RightHandRetentionClient,
  RightHandSnapshot,
  RightHandStaffRow,
} from "@/lib/admin-right-hand-types";

type CacheEntry = {
  dayKey: string;
  snapshot: RightHandSnapshot;
  expiresAt: number;
};

/** Bump ao mudar fórmula de KPIs (invalida cache in-process). */
const CACHE_VER = "v2";

const snapshotCache = new Map<string, CacheEntry>();

function dayKeyInTz(iso: string, tz: string): string {
  try {
    return formatInTimeZone(new Date(iso), tz, "yyyy-MM-dd");
  } catch {
    return iso.slice(0, 10);
  }
}

function asOfForPrevious(range: DashboardRange, now: Date): Date {
  const meta = getDashboardPeriodMeta(range, now);
  switch (range) {
    case "day":
      return subDays(now, 1);
    case "7d":
      return subDays(now, 7);
    case "month":
      return subDays(meta.from, 1);
    case "3m":
      return subDays(now, 90);
    default: {
      const _n: never = range;
      return _n;
    }
  }
}

function toMetricRows(
  rows: {
    status: string;
    paidAt: Date | null;
    amountPaid: unknown;
    startsAt: Date;
    service: { price: unknown };
  }[],
): MetricAppointmentRow[] {
  return rows.map((r) => ({
    status: r.status,
    paidAt: r.paidAt,
    amountPaid: r.amountPaid != null ? Number(r.amountPaid) : null,
    servicePrice: Number(r.service.price),
    startsAt: r.startsAt,
  }));
}

async function loadPeriodRows(access: StaffAccess, from: Date, to: Date) {
  const whereBase = appointmentListWhere(access, {});
  const [startsAtRows, paidRows] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        AND: [whereBase, { startsAt: { gte: from, lte: to } }],
      },
      select: {
        status: true,
        paidAt: true,
        amountPaid: true,
        startsAt: true,
        service: { select: { price: true } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        AND: [
          whereBase,
          { status: { not: "CANCELLED" } },
          { paidAt: { not: null, gte: from, lte: to } },
        ],
      },
      select: {
        status: true,
        paidAt: true,
        amountPaid: true,
        startsAt: true,
        service: { select: { price: true } },
      },
    }),
  ]);
  return {
    startsAtRows: toMetricRows(startsAtRows),
    paidRows: toMetricRows(paidRows),
  };
}

function weakHeatHint(heatmap: AppointmentFrequencyHeatmap): string | null {
  const weekdayLabels: Record<number, string> = {
    1: "Segunda",
    2: "Terça",
    3: "Quarta",
    4: "Quinta",
    5: "Sexta",
    6: "Sábado",
    7: "Domingo",
  };
  let weakest: { weekdayLabel: string; hour: number; percent: number } | null =
    null;
  for (const cell of heatmap.cells) {
    if (weakest == null || cell.percent < weakest.percent) {
      weakest = {
        weekdayLabel: weekdayLabels[cell.weekday] ?? `Dia ${cell.weekday}`,
        hour: cell.hour,
        percent: cell.percent,
      };
    }
  }
  if (!weakest || heatmap.cells.every((c) => c.count === 0)) return null;
  if (weakest.percent >= 35) return null;
  return `${weakest.weekdayLabel} às ${String(weakest.hour).padStart(2, "0")}h com ~${weakest.percent}% de carga estimada`;
}

function buildPromo(
  heatHint: string | null,
): RightHandPromoSuggestion | null {
  if (!heatHint) return null;
  const copyText = `🔥 Horário especial: ${heatHint.replace(/ com ~.*/, "")} com 20% off no corte. Reserve pelo link da agenda!`;
  return {
    title: "Campanha de horário fraco",
    detail: `Sugestão a partir do heatmap: ${heatHint}.`,
    copyText,
    href: "/admin/whatsapp",
  };
}

/**
 * Snapshot do Braço Direito — métricas + séries + fila de retenção.
 */
export async function getRightHandSnapshot(
  access: StaffAccess,
  range: DashboardRange,
  opts?: { forceRefresh?: boolean },
): Promise<RightHandSnapshot | null> {
  if (access.role !== "OWNER" && access.role !== "ADMIN") return null;
  if (!access.permissions.viewRevenue) return null;

  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
    select: { timezone: true, slug: true, createdAt: true },
  });
  const tz = org?.timezone?.trim() || BARBER_TIMEZONE;
  const now = new Date();
  const generatedAt = now.toISOString();
  const dayKey = dayKeyInTz(generatedAt, tz);
  const cacheKey = `${CACHE_VER}:${access.organizationId}:${range}:${dayKey}`;

  if (!opts?.forceRefresh) {
    const hit = snapshotCache.get(cacheKey);
    if (hit && hit.dayKey === dayKey && hit.expiresAt > Date.now()) {
      return hit.snapshot;
    }
  }

  const meta = getDashboardPeriodMeta(range, now);
  const prevAsOf = asOfForPrevious(range, now);
  const prevMeta = getDashboardPeriodMeta(range, prevAsOf);
  const whereBase = appointmentListWhere(access, {});

  const fourWeeksAgo = subDays(now, 28);

  const [
    currentReport,
    currentPeriod,
    prevPeriod,
    firstAppt,
    crm,
    heatmap,
    currentClientsInPeriod,
    paidHistory,
    completedHistory,
    recentStarts,
  ] = await Promise.all([
    getAdminReportsSnapshot(access, range, {}),
    loadPeriodRows(access, meta.from, meta.to),
    loadPeriodRows(access, prevMeta.from, prevMeta.to),
    prisma.appointment.findFirst({
      where: { AND: [whereBase] },
      orderBy: { startsAt: "asc" },
      select: { startsAt: true },
    }),
    getAdminCrmSnapshot(access, {
      riskFilter: "actionable",
      sort: "risk",
      page: 1,
      pageSize: 8,
    }),
    getAppointmentFrequencyHeatmap(access, {}),
    prisma.appointment.findMany({
      where: {
        AND: [
          whereBase,
          { startsAt: { gte: meta.from, lte: meta.to } },
          { status: { in: ["CONFIRMED", "COMPLETED"] } },
        ],
      },
      select: { clientPhone: true, status: true },
      take: 5000,
    }),
    prisma.appointment.findMany({
      where: {
        AND: [
          whereBase,
          { paymentStatus: "PAID", amountPaid: { not: null } },
        ],
      },
      select: { clientPhone: true, amountPaid: true },
      take: 8000,
    }),
    prisma.appointment.findMany({
      where: {
        AND: [whereBase, { status: "COMPLETED" }],
      },
      select: { clientPhone: true, startsAt: true },
      orderBy: { startsAt: "asc" },
      take: 12000,
    }),
    prisma.appointment.findMany({
      where: {
        AND: [
          whereBase,
          { startsAt: { gte: fourWeeksAgo, lte: now } },
          { status: { in: ["CONFIRMED", "COMPLETED"] } },
        ],
      },
      select: { startsAt: true },
      take: 5000,
    }),
  ]);

  const currentAgg = aggregatePeriodMetrics(
    currentPeriod.startsAtRows,
    { from: meta.from, to: meta.to },
    currentPeriod.paidRows,
  );
  const prevAgg = aggregatePeriodMetrics(
    prevPeriod.startsAtRows,
    { from: prevMeta.from, to: prevMeta.to },
    prevPeriod.paidRows,
  );

  const historyAnchor = firstAppt?.startsAt ?? org?.createdAt ?? now;
  const historyDays = Math.max(
    0,
    differenceInCalendarDays(now, historyAnchor),
  );

  let maturity: RightHandMaturity = "full";
  let maturityMessage: string | null = null;
  if (historyDays < 7) {
    maturity = "insufficient";
    maturityMessage =
      "Ainda coletando dados — comparativos completos aparecem a partir de 2 semanas de operação.";
  } else if (historyDays < 14) {
    maturity = "partial";
    maturityMessage =
      "Histórico parcial — use os números com cautela até completar ~2 semanas.";
  }

  const empty = currentAgg.appointments === 0 && currentAgg.paidCount === 0;
  const allowDelta = maturity !== "insufficient";

  const revenue = currentAgg.revenuePaid;
  const appointments = currentAgg.appointments;
  const avgTicket = currentAgg.avgTicketPaid;
  const cancelRate = currentAgg.cancelRate;

  const compare: RightHandCompareMetric[] = [
    {
      key: "revenue",
      label: "Receita",
      current: revenue,
      previous: prevAgg.revenuePaid,
      deltaPercent: allowDelta
        ? pctDelta(revenue, prevAgg.revenuePaid)
        : null,
      deltaMode: "percent",
      format: "money",
    },
    {
      key: "appointments",
      label: "Atendimentos",
      current: appointments,
      previous: prevAgg.appointments,
      deltaPercent: allowDelta
        ? pctDelta(appointments, prevAgg.appointments)
        : null,
      deltaMode: "percent",
      format: "number",
    },
    {
      key: "avgTicket",
      label: "Ticket médio (pagos)",
      current: avgTicket,
      previous: prevAgg.avgTicketPaid,
      deltaPercent: allowDelta
        ? pctDelta(avgTicket, prevAgg.avgTicketPaid)
        : null,
      deltaMode: "percent",
      format: "money",
    },
    {
      key: "cancelRate",
      label: "Cancelamentos",
      current: cancelRate,
      previous: prevAgg.cancelRate,
      deltaPercent: allowDelta
        ? pointsDelta(cancelRate, prevAgg.cancelRate)
        : null,
      deltaMode: "points",
      format: "percent",
    },
  ];

  const phonesInPeriod = new Set(
    currentClientsInPeriod
      .map((a) => a.clientPhone.replace(/\D/g, ""))
      .filter((d) => d.length >= 10),
  );
  let newClients = 0;
  let recurringClients = 0;
  if (phonesInPeriod.size > 0) {
    const priorAll = await prisma.appointment.findMany({
      where: {
        AND: [
          whereBase,
          { status: "COMPLETED", startsAt: { lt: meta.from } },
        ],
      },
      select: { clientPhone: true },
      distinct: ["clientPhone"],
      take: 8000,
    });
    const priorSet = new Set(
      priorAll.map((p) => p.clientPhone.replace(/\D/g, "")),
    );
    for (const digits of phonesInPeriod) {
      if (priorSet.has(digits)) recurringClients += 1;
      else newClients += 1;
    }
  }

  // LTV org-wide: média de gasto por telefone com PAID (não CRM page 1).
  const spendByPhone = new Map<string, number>();
  for (const p of paidHistory) {
    const key = p.clientPhone.replace(/\D/g, "");
    if (key.length < 10) continue;
    spendByPhone.set(
      key,
      (spendByPhone.get(key) ?? 0) + Number(p.amountPaid ?? 0),
    );
  }
  const estimatedLtv = averageHistoricalLtv([...spendByPhone.values()]);

  // Coortes
  const firstByPhone = new Map<string, Date>();
  const completedFlat: { phoneKey: string; at: Date }[] = [];
  for (const row of completedHistory) {
    const key = row.clientPhone.replace(/\D/g, "");
    if (key.length < 10) continue;
    completedFlat.push({ phoneKey: key, at: row.startsAt });
    const prev = firstByPhone.get(key);
    if (!prev || row.startsAt < prev) firstByPhone.set(key, row.startsAt);
  }
  const cohorts = computeReturnCohorts(firstByPhone, completedFlat, now);

  // Intervalos usuais para early churn
  const visitsByPhone = new Map<string, Date[]>();
  for (const row of completedFlat) {
    const list = visitsByPhone.get(row.phoneKey) ?? [];
    list.push(row.at);
    visitsByPhone.set(row.phoneKey, list);
  }
  const usualGap = new Map<string, number>();
  for (const [phone, dates] of visitsByPhone) {
    if (dates.length < 3) continue;
    dates.sort((a, b) => a.getTime() - b.getTime());
    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push(
        differenceInCalendarDays(dates[i]!, dates[i - 1]!),
      );
    }
    const avg = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    usualGap.set(phone, avg);
  }

  const retentionQueue: RightHandRetentionClient[] = crm.actionQueue
    .filter(
      (c): c is typeof c & { risk: "at_risk" | "lost" } =>
        c.risk === "at_risk" || c.risk === "lost",
    )
    .slice(0, 5)
    .map((c) => {
      const gap = usualGap.get(c.phoneKey);
      const days = c.daysSinceLastActivity;
      let earlyChurnHint: string | null = null;
      if (
        gap != null &&
        days != null &&
        days < 45 &&
        days >= Math.max(14, gap * 1.4)
      ) {
        earlyChurnHint = `Costuma voltar a cada ~${Math.round(gap)}d; já faz ${days}d — risco antecipado.`;
      }
      return {
        phoneKey: c.phoneKey,
        name: c.name,
        phone: c.phone,
        risk: c.risk,
        daysSinceLastActivity: c.daysSinceLastActivity,
        lastServiceName: c.lastServiceName,
        totalSpent: c.totalSpent,
        clubPlanName: c.clubPlanName,
        earlyChurnHint,
      };
    });

  const topSpend = retentionQueue
    .filter((c) => (c.totalSpent ?? 0) > 0)
    .sort((a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0))[0];

  const heatHint = weakHeatHint(heatmap);
  const promoSuggestion = buildPromo(heatHint);

  // Previsão próxima semana (média por weekday nas últimas 4 semanas)
  const byWeek: Record<number, number[]> = {};
  const weekBuckets = new Map<string, Map<number, number>>();
  for (const r of recentStarts) {
    const wd = getISODay(r.startsAt);
    const weekKey = startOfISOWeek(r.startsAt).toISOString().slice(0, 10);
    if (!weekBuckets.has(weekKey)) weekBuckets.set(weekKey, new Map());
    const m = weekBuckets.get(weekKey)!;
    m.set(wd, (m.get(wd) ?? 0) + 1);
  }
  for (const m of weekBuckets.values()) {
    for (let wd = 1; wd <= 7; wd++) {
      const n = m.get(wd) ?? 0;
      if (!byWeek[wd]) byWeek[wd] = [];
      byWeek[wd]!.push(n);
    }
  }
  const demandPred = predictWeekdayDemand(byWeek);
  let prediction: RightHandPrediction | null = null;
  if (demandPred.length > 0 && demandPred[0]!.avg < (demandPred[demandPred.length - 1]?.avg ?? 0) * 0.7) {
    const weak = demandPred[0]!;
    prediction = {
      weakWeekdayLabel: weak.label,
      weakAvg: weak.avg,
      detail: `${weak.label} costuma ter ~${weak.avg} atendimentos (média das últimas semanas). Considere promoção antecipada.`,
    };
  }

  const peakValley = findPeakValley(
    currentReport.revenueSeries.map((p) => p.amount),
  );

  const kpis = {
    revenue,
    appointments,
    paidCount: currentAgg.paidCount,
    completedUnpaid: currentAgg.completedUnpaid,
    appointmentsHint: appointmentsSubtitle(currentAgg),
    avgTicket,
    cancelRate,
    completionRate: currentAgg.completionRate,
    newClients,
    recurringClients,
    atRiskClients: crm.atRiskCount,
    lostClients: crm.lostCount,
    estimatedLtv,
  };

  const facts: RightHandFacts = {
    generatedAt,
    organizationId: access.organizationId,
    range,
    periodLabel: meta.periodLabel,
    maturity,
    historyDays,
    empty,
    kpis,
    compare: compare.map((c) => ({
      key: c.key,
      label: c.label,
      current: c.current,
      previous: c.previous,
      deltaPercent: c.deltaPercent,
      deltaMode: c.deltaMode,
    })),
    funnel: currentAgg.funnel,
    cohorts,
    topServices: currentReport.servicesInPeriod.slice(0, 5).map((s) => ({
      name: s.name,
      count: s.count,
    })),
    topStaff: currentReport.staffRanking.slice(0, 5).map((s) => ({
      label: s.label,
      received: s.received,
      completed: s.completed,
    })),
    retention: {
      atRisk: crm.atRiskCount,
      lost: crm.lostCount,
      topSpendHint: topSpend
        ? `${topSpend.name.split(/\s+/)[0]} · R$ ${(topSpend.totalSpent ?? 0).toFixed(0)} histórico · ${topSpend.daysSinceLastActivity ?? "?"}d`
        : null,
    },
    weakHeatHint: heatHint,
    prediction,
    promoSuggestion,
  };

  const snapshot: RightHandSnapshot = {
    generatedAt,
    organizationId: access.organizationId,
    range,
    periodLabel: meta.periodLabel,
    previousPeriodLabel: prevMeta.periodLabel,
    maturity,
    maturityMessage,
    historyDays,
    empty,
    publicBookingPath: org?.slug ? `/${org.slug}/agendar` : null,
    kpis,
    compare,
    funnel: currentAgg.funnel,
    cohorts,
    revenueSeries: currentReport.revenueSeries,
    peakValley,
    services: currentReport.servicesInPeriod,
    staffRanking: currentReport.staffRanking.map((s) => ({
      label: s.label,
      appointments: s.appointments,
      completed: s.completed,
      cancelled: s.cancelled,
      received: s.received,
    })),
    heatmap,
    retentionQueue,
    prediction,
    promoSuggestion,
    facts,
  };

  snapshotCache.set(cacheKey, {
    dayKey,
    snapshot,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });

  return snapshot;
}
