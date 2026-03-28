import "server-only";

import {
  endOfDay,
  endOfWeek,
  format,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import type { AppointmentStatus } from "@prisma/client";

import { unitNameMapByIds } from "@/lib/appointment-unit-names";
import {
  bucketKeyForAppointment,
  bucketKeyForRevenueDay,
  buildVolumeBucketKeys,
  getDashboardPeriodMeta,
  parseDashboardRange,
  type DashboardRange,
} from "@/lib/dashboard-period";
import { prisma } from "@/lib/prisma";
import { staffLabelMapByIds } from "@/lib/staff-display-names";
import { appointmentScopeWhere, type StaffAccess } from "@/lib/staff-access";
import type {
  AppointmentRow,
  DashboardPaymentStackRow,
  DashboardPoint,
  DashboardRevenuePoint,
  DashboardServiceBar,
  DashboardStatusSlice,
  DashboardSummaryRow,
} from "@/lib/types";

export type { DashboardRange } from "@/lib/dashboard-period";

const STATUS_PIE_ORDER: AppointmentStatus[] = [
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
];

const STATUS_PIE_LABEL: Record<AppointmentStatus, string> = {
  CONFIRMED: "Confirmados",
  COMPLETED: "Concluídos",
  CANCELLED: "Cancelados",
};

const STATUS_PIE_COLOR: Record<AppointmentStatus, string> = {
  CONFIRMED: "#f59e0b",
  COMPLETED: "#38bdf8",
  CANCELLED: "#f87171",
};

export type AdminDashboardSnapshot = {
  range: DashboardRange;
  periodLabel: string;
  seriesTitle: string;
  metrics: {
    totalToday: number;
    totalWeek: number;
    totalAppointments: number;
    distinctClients: number;
    /** Concluídos no mês civil corrente (valor dos serviços) — cartões superiores. */
    revenueMonth: number;
    /** Concluídos sem pagamento registado (âmbito do utilizador). */
    pendingPaymentTotal: number;
    /** Soma recebida no período selecionado (`paidAt` no intervalo). */
    receivedInPeriod: number;
    /** Valor de serviços concluídos cujo `startsAt` cai no período. */
    completedValueInPeriod: number;
  };
  series: DashboardPoint[];
  statusSlices: DashboardStatusSlice[];
  servicesInPeriod: DashboardServiceBar[];
  revenueSeries: DashboardRevenuePoint[];
  paymentStack: DashboardPaymentStackRow[];
  summaryRows: DashboardSummaryRow[];
  nextAppointment: {
    clientName: string;
    startsAt: Date;
  } | null;
};

function scope(access: StaffAccess) {
  return appointmentScopeWhere(access);
}

function seriesTitleFor(range: DashboardRange): string {
  switch (range) {
    case "day":
      return "Volume por hora (inícios de agendamento)";
    case "7d":
      return "Volume por dia";
    case "month":
      return "Volume por dia";
    case "3m":
      return "Volume por semana";
    default: {
      const _e: never = range;
      return _e;
    }
  }
}

export async function getAdminDashboardSnapshot(
  access: StaffAccess,
  rangeRaw?: string,
): Promise<AdminDashboardSnapshot> {
  const range = parseDashboardRange(rangeRaw);
  const now = new Date();
  const meta = getDashboardPeriodMeta(range, now);
  const whereBase = scope(access);

  const startToday = startOfDay(now);
  const endToday = endOfDay(now);
  const startWeek = startOfWeek(now, { weekStartsOn: 1 });
  const endWeek = endOfWeek(now, { weekStartsOn: 1 });

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const periodWhere = {
    ...whereBase,
    startsAt: {
      gte: meta.from,
      lte: meta.to,
    },
  };

  const monthWhere = {
    ...whereBase,
    startsAt: {
      gte: monthStart,
      lte: monthEnd,
    },
  };

  const [
    periodRows,
    paidInPeriodRows,
    todayCount,
    weekCount,
    totalCount,
    nextAppointment,
    distinctPhones,
    completedMonthRows,
    pendingPaymentCount,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: periodWhere,
      select: {
        startsAt: true,
        status: true,
        paidAt: true,
        serviceId: true,
        service: { select: { price: true } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        ...whereBase,
        status: "COMPLETED",
        paidAt: {
          gte: meta.from,
          lte: meta.to,
        },
      },
      select: {
        paidAt: true,
        service: { select: { price: true } },
      },
    }),
    prisma.appointment.count({
      where: {
        ...whereBase,
        startsAt: {
          gte: startToday,
          lte: endToday,
        },
      },
    }),
    prisma.appointment.count({
      where: {
        ...whereBase,
        startsAt: {
          gte: startWeek,
          lte: endWeek,
        },
      },
    }),
    prisma.appointment.count({ where: whereBase }),
    prisma.appointment.findFirst({
      where: {
        ...whereBase,
        startsAt: { gt: now },
        status: "CONFIRMED",
      },
      orderBy: { startsAt: "asc" },
      select: { clientName: true, startsAt: true },
    }),
    prisma.appointment.groupBy({
      by: ["clientPhone"],
      where: whereBase,
    }),
    prisma.appointment.findMany({
      where: {
        ...whereBase,
        status: "COMPLETED",
        startsAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: { service: true },
    }),
    prisma.appointment.count({
      where: {
        ...whereBase,
        status: "COMPLETED",
        paidAt: null,
      },
    }),
  ]);

  const bucketKeys = buildVolumeBucketKeys(meta);
  const countMap = new Map(bucketKeys.map((b) => [b.key, 0]));
  for (const row of periodRows) {
    const k = bucketKeyForAppointment(meta, row.startsAt);
    if (k && countMap.has(k)) {
      countMap.set(k, (countMap.get(k) ?? 0) + 1);
    }
  }
  const series: DashboardPoint[] = bucketKeys.map((b) => ({
    date: b.key,
    dateLabel: b.label,
    count: countMap.get(b.key) ?? 0,
  }));

  const statusCountMap = new Map<AppointmentStatus, number>();
  for (const st of STATUS_PIE_ORDER) statusCountMap.set(st, 0);
  for (const row of periodRows) {
    statusCountMap.set(
      row.status,
      (statusCountMap.get(row.status) ?? 0) + 1,
    );
  }
  const statusSlices: DashboardStatusSlice[] = STATUS_PIE_ORDER.map((st) => ({
    name: STATUS_PIE_LABEL[st],
    value: statusCountMap.get(st) ?? 0,
    color: STATUS_PIE_COLOR[st],
  }));

  const serviceCount = new Map<string, number>();
  for (const row of periodRows) {
    serviceCount.set(
      row.serviceId,
      (serviceCount.get(row.serviceId) ?? 0) + 1,
    );
  }
  const serviceIds = [...serviceCount.keys()];
  const serviceRows =
    serviceIds.length > 0
      ? await prisma.service.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true, name: true },
        })
      : [];
  const idToName = new Map(serviceRows.map((s) => [s.id, s.name] as const));
  const servicesInPeriod: DashboardServiceBar[] = [...serviceCount.entries()]
    .map(([id, count]) => ({
      name: idToName.get(id) ?? "Serviço",
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const revenueMonth = access.permissions.viewRevenue
    ? completedMonthRows.reduce((s, r) => s + Number(r.service.price), 0)
    : 0;

  const amountMap = new Map(bucketKeys.map((b) => [b.key, 0]));
  for (const row of paidInPeriodRows) {
    if (!row.paidAt) continue;
    const k = bucketKeyForRevenueDay(meta, row.paidAt);
    if (k && amountMap.has(k)) {
      amountMap.set(
        k,
        (amountMap.get(k) ?? 0) + Number(row.service.price),
      );
    }
  }
  const revenueSeries: DashboardRevenuePoint[] = bucketKeys.map((b) => ({
    date: b.key,
    dateLabel: b.label,
    amount: access.permissions.viewRevenue ? (amountMap.get(b.key) ?? 0) : 0,
  }));

  const completedInPeriod = periodRows.filter((r) => r.status === "COMPLETED");
  const paidCompleted = completedInPeriod.filter((r) => r.paidAt !== null).length;
  const unpaidCompleted = completedInPeriod.filter((r) => r.paidAt === null)
    .length;
  const paymentStack: DashboardPaymentStackRow[] = [
    {
      name: "Concluídos no período",
      pagos: paidCompleted,
      aReceber: unpaidCompleted,
    },
  ];

  const receivedInPeriod = access.permissions.viewRevenue
    ? paidInPeriodRows.reduce((s, r) => s + Number(r.service.price), 0)
    : 0;

  const completedValueInPeriod = access.permissions.viewRevenue
    ? completedInPeriod.reduce((s, r) => s + Number(r.service.price), 0)
    : 0;

  const periodTotal = periodRows.length;
  const topService = servicesInPeriod[0];

  const summaryRows: DashboardSummaryRow[] = [
    {
      label: "Agendamentos no período",
      value: String(periodTotal),
      hint: meta.periodLabel,
    },
    {
      label: "Total no histórico (seu acesso)",
      value: String(totalCount),
    },
  ];

  if (topService) {
    summaryRows.push({
      label: "Serviço em destaque (período)",
      value: topService.name,
      hint: `${topService.count} reserva(s)`,
    });
  }

  if (access.permissions.viewRevenue) {
    summaryRows.push(
      {
        label: "Valor concluído no período",
        value: `R$ ${completedValueInPeriod.toFixed(2)}`,
        hint: "Por data do atendimento",
      },
      {
        label: "Recebido no período",
        value: `R$ ${receivedInPeriod.toFixed(2)}`,
        hint: "Por data do pagamento registado",
      },
      {
        label: "Faturamento (mês civil, concluídos)",
        value: `R$ ${revenueMonth.toFixed(2)}`,
        hint: format(monthStart, "MMMM yyyy", { locale: ptBR }),
      },
    );
  }

  summaryRows.push({
    label: "Concluídos sem pagamento registado",
    value: String(pendingPaymentCount),
    hint: "Em todo o histórico do seu acesso",
  });

  summaryRows.push({
    label: "Clientes distintos (telefone)",
    value: String(distinctPhones.length),
  });

  return {
    range,
    periodLabel: meta.periodLabel,
    seriesTitle: seriesTitleFor(range),
    metrics: {
      totalToday: todayCount,
      totalWeek: weekCount,
      totalAppointments: totalCount,
      distinctClients: distinctPhones.length,
      revenueMonth,
      pendingPaymentTotal: pendingPaymentCount,
      receivedInPeriod,
      completedValueInPeriod,
    },
    series,
    statusSlices,
    servicesInPeriod,
    revenueSeries,
    paymentStack,
    summaryRows,
    nextAppointment: nextAppointment
      ? {
          clientName: nextAppointment.clientName,
          startsAt: nextAppointment.startsAt,
        }
      : null,
  };
}

const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 50;

export async function getAdminAppointmentsPaginated(
  access: StaffAccess,
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<{ rows: AppointmentRow[]; total: number; page: number; pageSize: number }> {
  const safeSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * safeSize;
  const whereBase = scope(access);

  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      where: whereBase,
      skip,
      take: safeSize,
      orderBy: { startsAt: "desc" },
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        clientEmail: true,
        startsAt: true,
        status: true,
        unitId: true,
        staffMemberId: true,
        paidAt: true,
        paymentMethod: true,
        service: { select: { name: true } },
      },
    }),
    prisma.appointment.count({ where: whereBase }),
  ]);

  const unitNames = await unitNameMapByIds(items.map((i) => i.unitId));
  const staffLabels = await staffLabelMapByIds(
    items.map((i) => i.staffMemberId),
  );

  const rows: AppointmentRow[] = items.map((item) => ({
    id: item.id,
    clientName: item.clientName,
    clientPhone: item.clientPhone,
    clientEmail: item.clientEmail,
    serviceName: item.service.name,
    startsAt: item.startsAt.toISOString(),
    status: item.status,
    unitName: item.unitId ? (unitNames.get(item.unitId) ?? null) : null,
    unitId: item.unitId,
    staffMemberId: item.staffMemberId,
    assignedStaffLabel: item.staffMemberId
      ? (staffLabels.get(item.staffMemberId) ?? null)
      : null,
    paidAt: item.paidAt?.toISOString() ?? null,
    paymentMethod: item.paymentMethod,
  }));

  return { rows, total, page: safePage, pageSize: safeSize };
}
