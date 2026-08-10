import "server-only";

import { differenceInCalendarDays, subDays } from "date-fns";
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
  RightHandRetentionClient,
  RightHandSnapshot,
} from "@/lib/admin-right-hand-types";
import { BARBER_TIMEZONE } from "@/lib/constants";
import {
  getDashboardPeriodMeta,
  type DashboardRange,
} from "@/lib/dashboard-period";
import { prisma } from "@/lib/prisma";
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

const snapshotCache = new Map<string, CacheEntry>();

function dayKeyInTz(iso: string, tz: string): string {
  try {
    return formatInTimeZone(new Date(iso), tz, "yyyy-MM-dd");
  } catch {
    return iso.slice(0, 10);
  }
}

function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0 && current <= 0) return null;
  if (previous <= 0) return 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
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

async function periodTotals(
  access: StaffAccess,
  from: Date,
  to: Date,
): Promise<{
  appointments: number;
  completed: number;
  cancelled: number;
  revenue: number;
  completedValue: number;
}> {
  const whereBase = appointmentListWhere(access, {});
  const rows = await prisma.appointment.findMany({
    where: {
      AND: [whereBase, { startsAt: { gte: from, lte: to } }],
    },
    select: {
      status: true,
      paidAt: true,
      amountPaid: true,
      service: { select: { price: true } },
    },
  });

  let revenue = 0;
  let completedValue = 0;
  let completed = 0;
  let cancelled = 0;
  for (const r of rows) {
    if (r.status === "COMPLETED") {
      completed += 1;
      completedValue += Number(r.service.price);
    }
    if (r.status === "CANCELLED") cancelled += 1;
    if (r.paidAt && r.paidAt >= from && r.paidAt <= to) {
      revenue +=
        r.amountPaid != null ? Number(r.amountPaid) : Number(r.service.price);
    }
  }

  return {
    appointments: rows.length,
    completed,
    cancelled,
    revenue: Math.round(revenue * 100) / 100,
    completedValue: Math.round(completedValue * 100) / 100,
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
  const cacheKey = `${access.organizationId}:${range}:${dayKey}`;

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

  const [
    currentReport,
    prevTotals,
    firstAppt,
    crm,
    heatmap,
    currentClientsInPeriod,
  ] = await Promise.all([
    getAdminReportsSnapshot(access, range, {}),
    periodTotals(access, prevMeta.from, prevMeta.to),
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
  ]);

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

  const empty = currentReport.metrics.totalAppointments === 0;

  const revenue = currentReport.metrics.receivedInPeriod;
  const appointments = currentReport.metrics.totalAppointments;
  const avgTicket = currentReport.avgTicket;
  const cancelRate = currentReport.cancelRate;
  const prevAvgTicket =
    prevTotals.completed > 0
      ? Math.round((prevTotals.completedValue / prevTotals.completed) * 100) /
        100
      : 0;
  const prevCancelRate = prevTotals.appointments
    ? Math.round((prevTotals.cancelled / prevTotals.appointments) * 1000) / 10
    : 0;

  const allowDelta = maturity !== "insufficient";

  const compare: RightHandCompareMetric[] = [
    {
      key: "revenue",
      label: "Receita",
      current: revenue,
      previous: prevTotals.revenue,
      deltaPercent: allowDelta ? pctDelta(revenue, prevTotals.revenue) : null,
      format: "money",
    },
    {
      key: "appointments",
      label: "Atendimentos",
      current: appointments,
      previous: prevTotals.appointments,
      deltaPercent: allowDelta
        ? pctDelta(appointments, prevTotals.appointments)
        : null,
      format: "number",
    },
    {
      key: "avgTicket",
      label: "Ticket médio",
      current: avgTicket,
      previous: prevAvgTicket,
      deltaPercent: allowDelta ? pctDelta(avgTicket, prevAvgTicket) : null,
      format: "money",
    },
    {
      key: "cancelRate",
      label: "Cancelamentos",
      current: cancelRate,
      previous: prevCancelRate,
      deltaPercent: allowDelta ? pctDelta(cancelRate, prevCancelRate) : null,
      format: "percent",
    },
  ];

  // Novos vs recorrentes no período (telefone): COMPLETED antes do período = recorrente.
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

  const spentClients = crm.clients.filter((c) => (c.totalSpent ?? 0) > 0);
  const estimatedLtv =
    spentClients.length > 0 && crm.canViewRevenue
      ? Math.round(
          (spentClients.reduce((s, c) => s + (c.totalSpent ?? 0), 0) /
            spentClients.length) *
            100,
        ) / 100
      : null;

  const retentionQueue: RightHandRetentionClient[] = crm.actionQueue
    .filter(
      (c): c is typeof c & { risk: "at_risk" | "lost" } =>
        c.risk === "at_risk" || c.risk === "lost",
    )
    .slice(0, 5)
    .map((c) => ({
      phoneKey: c.phoneKey,
      name: c.name,
      phone: c.phone,
      risk: c.risk,
      daysSinceLastActivity: c.daysSinceLastActivity,
      lastServiceName: c.lastServiceName,
      totalSpent: c.totalSpent,
      clubPlanName: c.clubPlanName,
    }));

  const topSpend = retentionQueue
    .filter((c) => (c.totalSpent ?? 0) > 0)
    .sort((a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0))[0];

  const heatHint = weakHeatHint(heatmap);

  const kpis = {
    revenue,
    appointments,
    avgTicket,
    cancelRate,
    completionRate: currentReport.completionRate,
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
    })),
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
    revenueSeries: currentReport.revenueSeries,
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
    facts,
  };

  snapshotCache.set(cacheKey, {
    dayKey,
    snapshot,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });

  return snapshot;
}
