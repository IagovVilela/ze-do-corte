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
import { appointmentListWhere } from "@/lib/admin-appointment-list-where";
import type { AdminListFiltersParsed, TelemetryScope } from "@/lib/admin-list-url";
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
import { type StaffAccess } from "@/lib/staff-access";
import type {
  AppointmentRow,
  DashboardPaymentStackRow,
  DashboardPoint,
  DashboardRevenuePoint,
  DashboardServiceBar,
  DashboardStatusSlice,
  DashboardSummaryRow,
  DashboardUnitTelemetryRow,
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
    /** Soma do preço do serviço para CONFIRMED + COMPLETED no período (`startsAt`), exclui cancelados. */
    scheduledValueInPeriod: number;
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
  /** Só OWNER/ADMIN: métricas separadas por unidade (hoje / semana). */
  unitTelemetry: DashboardUnitTelemetryRow[] | null;
  /** Janela usada para montar `unitTelemetry` (URL `telemetryScope=`). */
  unitTelemetryScope: TelemetryScope;
};

function buildDashboardUnitTelemetryChartPeriod(opts: {
  units: { id: string; name: string; isActive: boolean }[];
  periodRows: {
    unitId: string | null;
    status: AppointmentStatus;
    service: { price: { toString(): string } };
  }[];
  paidInPeriodRows: {
    unitId: string | null;
    service: { price: { toString(): string } };
  }[];
  viewRevenue: boolean;
}): DashboardUnitTelemetryRow[] {
  function rowsForUnit(unitId: string | null) {
    return opts.periodRows.filter((r) => r.unitId === unitId);
  }

  function aggregate(pr: (typeof opts.periodRows)[number][]) {
    let confirmed = 0;
    let completed = 0;
    let cancelled = 0;
    for (const r of pr) {
      if (r.status === "CONFIRMED") confirmed += 1;
      if (r.status === "COMPLETED") completed += 1;
      if (r.status === "CANCELLED") cancelled += 1;
    }
    const completedValue = opts.viewRevenue
      ? pr
          .filter((r) => r.status === "COMPLETED")
          .reduce((s, r) => s + Number(r.service.price), 0)
      : 0;
    return {
      total: pr.length,
      confirmed,
      completed,
      cancelled,
      completedValue,
    };
  }

  const rows: DashboardUnitTelemetryRow[] = opts.units.map((u) => {
    const pr = rowsForUnit(u.id);
    const a = aggregate(pr);
    const received = opts.viewRevenue
      ? opts.paidInPeriodRows
          .filter((r) => r.unitId === u.id)
          .reduce((s, r) => s + Number(r.service.price), 0)
      : 0;
    return {
      unitId: u.id,
      unitName: u.name,
      isActive: u.isActive,
      appointmentsToday: a.total,
      appointmentsWeek: 0,
      todayConfirmed: a.confirmed,
      todayCompleted: a.completed,
      todayCancelled: a.cancelled,
      receivedToday: opts.viewRevenue ? received : null,
      completedValueToday: opts.viewRevenue ? a.completedValue : null,
    };
  });

  const prNull = rowsForUnit(null);
  const aNull = aggregate(prNull);
  const receivedNull = opts.viewRevenue
    ? opts.paidInPeriodRows
        .filter((r) => r.unitId === null)
        .reduce((s, r) => s + Number(r.service.price), 0)
    : 0;

  if (aNull.total > 0) {
    rows.push({
      unitId: "",
      unitName: "Sem unidade",
      isActive: true,
      appointmentsToday: aNull.total,
      appointmentsWeek: 0,
      todayConfirmed: aNull.confirmed,
      todayCompleted: aNull.completed,
      todayCancelled: aNull.cancelled,
      receivedToday: opts.viewRevenue ? receivedNull : null,
      completedValueToday: opts.viewRevenue ? aNull.completedValue : null,
    });
  }

  return rows;
}

function buildDashboardUnitTelemetry(opts: {
  units: { id: string; name: string; isActive: boolean }[];
  todayRows: {
    unitId: string | null;
    status: AppointmentStatus;
    paidAt: Date | null;
    service: { price: { toString(): string } };
  }[];
  weekRows: { unitId: string | null }[];
  startToday: Date;
  endToday: Date;
  viewRevenue: boolean;
}): DashboardUnitTelemetryRow[] {
  const weekByUnit = new Map<string | null, number>();
  for (const r of opts.weekRows) {
    const k = r.unitId;
    weekByUnit.set(k, (weekByUnit.get(k) ?? 0) + 1);
  }

  type Agg = {
    total: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    received: number;
    completedValue: number;
  };
  const todayAgg = new Map<string | null, Agg>();

  function ensureAgg(unitId: string | null): Agg {
    let a = todayAgg.get(unitId);
    if (!a) {
      a = {
        total: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        received: 0,
        completedValue: 0,
      };
      todayAgg.set(unitId, a);
    }
    return a;
  }

  for (const r of opts.todayRows) {
    const a = ensureAgg(r.unitId);
    a.total += 1;
    if (r.status === "CONFIRMED") a.confirmed += 1;
    if (r.status === "COMPLETED") a.completed += 1;
    if (r.status === "CANCELLED") a.cancelled += 1;
    if (opts.viewRevenue) {
      const price = Number(r.service.price);
      if (
        r.paidAt &&
        r.paidAt >= opts.startToday &&
        r.paidAt <= opts.endToday &&
        r.status !== "CANCELLED"
      ) {
        a.received += price;
      }
      if (r.status === "COMPLETED") {
        a.completedValue += price;
      }
    }
  }

  const rows: DashboardUnitTelemetryRow[] = opts.units.map((u) => {
    const a = todayAgg.get(u.id) ?? {
      total: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      received: 0,
      completedValue: 0,
    };
    return {
      unitId: u.id,
      unitName: u.name,
      isActive: u.isActive,
      appointmentsToday: a.total,
      appointmentsWeek: weekByUnit.get(u.id) ?? 0,
      todayConfirmed: a.confirmed,
      todayCompleted: a.completed,
      todayCancelled: a.cancelled,
      receivedToday: opts.viewRevenue ? a.received : null,
      completedValueToday: opts.viewRevenue ? a.completedValue : null,
    };
  });

  const nullAgg = todayAgg.get(null);
  const nullWeek = weekByUnit.get(null) ?? 0;
  if (nullWeek > 0 || (nullAgg && nullAgg.total > 0)) {
    const a = nullAgg ?? {
      total: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      received: 0,
      completedValue: 0,
    };
    rows.push({
      unitId: "",
      unitName: "Sem unidade",
      isActive: true,
      appointmentsToday: a.total,
      appointmentsWeek: nullWeek,
      todayConfirmed: a.confirmed,
      todayCompleted: a.completed,
      todayCancelled: a.cancelled,
      receivedToday: opts.viewRevenue ? a.received : null,
      completedValueToday: opts.viewRevenue ? a.completedValue : null,
    });
  }

  return rows;
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
  listFilters: AdminListFiltersParsed = {},
  telemetryScope: TelemetryScope = "todayWeek",
): Promise<AdminDashboardSnapshot> {
  const range = parseDashboardRange(rangeRaw);
  const now = new Date();
  const meta = getDashboardPeriodMeta(range, now);
  const whereBase = appointmentListWhere(access, listFilters);
  const telemetryUnitWhere =
    listFilters.unit !== undefined
      ? { id: listFilters.unit }
      : undefined;

  const startToday = startOfDay(now);
  const endToday = endOfDay(now);
  const startWeek = startOfWeek(now, { weekStartsOn: 1 });
  const endWeek = endOfWeek(now, { weekStartsOn: 1 });

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const showUnitTelemetry =
    access.role === "OWNER" || access.role === "ADMIN";
  const needClassicUnitTelemetry =
    showUnitTelemetry && telemetryScope === "todayWeek";

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
    telemetryUnits,
    telemetryTodayRows,
    telemetryWeekRows,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: periodWhere,
      select: {
        id: true,
        startsAt: true,
        status: true,
        paidAt: true,
        serviceId: true,
        unitId: true,
        clientPhone: true,
        service: { select: { price: true } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        ...whereBase,
        /** Pagamento no balcão pode ser registado em CONFIRMED ou COMPLETED — recebimentos seguem `paidAt`. */
        status: { not: "CANCELLED" },
        paidAt: {
          not: null,
          gte: meta.from,
          lte: meta.to,
        },
      },
      select: {
        id: true,
        status: true,
        paidAt: true,
        unitId: true,
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
    showUnitTelemetry
      ? prisma.barbershopUnit.findMany({
          where: telemetryUnitWhere,
          orderBy: { name: "asc" },
          select: { id: true, name: true, isActive: true },
        })
      : Promise.resolve(
          [] as { id: string; name: string; isActive: boolean }[],
        ),
    needClassicUnitTelemetry
      ? prisma.appointment.findMany({
          where: {
            ...whereBase,
            startsAt: { gte: startToday, lte: endToday },
          },
          select: {
            unitId: true,
            status: true,
            paidAt: true,
            service: { select: { price: true } },
          },
        })
      : Promise.resolve(
          [] as {
            unitId: string | null;
            status: AppointmentStatus;
            paidAt: Date | null;
            service: { price: { toString(): string } };
          }[],
        ),
    needClassicUnitTelemetry
      ? prisma.appointment.findMany({
          where: {
            ...whereBase,
            startsAt: { gte: startWeek, lte: endWeek },
          },
          select: { unitId: true },
        })
      : Promise.resolve([] as { unitId: string | null }[]),
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

  /**
   * Empilhado alinhado ao gráfico de recebimentos: inclui confirmados/concluídos com início no
   * período **e** os que só entram por `paidAt` no período (início noutro mês/dia).
   */
  const stackById = new Map<
    string,
    { paidAt: Date | null; status: AppointmentStatus }
  >();
  for (const r of periodRows) {
    if (r.status === "CONFIRMED" || r.status === "COMPLETED") {
      stackById.set(r.id, { paidAt: r.paidAt, status: r.status });
    }
  }
  for (const r of paidInPeriodRows) {
    if (r.status !== "CONFIRMED" && r.status !== "COMPLETED") continue;
    if (!stackById.has(r.id)) {
      stackById.set(r.id, { paidAt: r.paidAt, status: r.status });
    }
  }
  const stackList = [...stackById.values()];
  const paidInStack = stackList.filter((r) => r.paidAt !== null).length;
  const unpaidInStack = stackList.filter((r) => r.paidAt === null).length;
  const paymentStack: DashboardPaymentStackRow[] = [
    {
      name: "Confirmados e concluídos no período",
      pagos: paidInStack,
      aReceber: unpaidInStack,
    },
  ];

  const receivedInPeriod = access.permissions.viewRevenue
    ? paidInPeriodRows.reduce((s, r) => s + Number(r.service.price), 0)
    : 0;

  const completedInPeriod = periodRows.filter((r) => r.status === "COMPLETED");
  const completedValueInPeriod = access.permissions.viewRevenue
    ? completedInPeriod.reduce((s, r) => s + Number(r.service.price), 0)
    : 0;

  const scheduledValueInPeriod = access.permissions.viewRevenue
    ? periodRows
        .filter(
          (r) => r.status === "CONFIRMED" || r.status === "COMPLETED",
        )
        .reduce((s, r) => s + Number(r.service.price), 0)
    : 0;

  const unpaidActiveInPeriod = periodRows.filter(
    (r) =>
      (r.status === "CONFIRMED" || r.status === "COMPLETED") &&
      r.paidAt === null,
  );
  const unpaidValueInPeriod = access.permissions.viewRevenue
    ? unpaidActiveInPeriod.reduce((s, r) => s + Number(r.service.price), 0)
    : 0;

  const periodTotal = periodRows.length;
  const nConfirmed = statusCountMap.get("CONFIRMED") ?? 0;
  const nCompleted = statusCountMap.get("COMPLETED") ?? 0;
  const nCancelled = statusCountMap.get("CANCELLED") ?? 0;
  const activeInPeriod = nConfirmed + nCompleted;
  const distinctPhonesInPeriod = new Set(
    periodRows
      .map((r) => r.clientPhone?.trim())
      .filter((p): p is string => Boolean(p && p.length > 0)),
  ).size;
  const avgTicketActivePeriod =
    access.permissions.viewRevenue && activeInPeriod > 0
      ? scheduledValueInPeriod / activeInPeriod
      : 0;

  const topService = servicesInPeriod[0];

  const summaryRows: DashboardSummaryRow[] = [
    {
      label: "Reservas no período",
      value: String(periodTotal),
      hint: `${meta.periodLabel} · ${nConfirmed} confirm., ${nCompleted} concl., ${nCancelled} cancel.`,
    },
  ];

  if (periodTotal > 0) {
    const cancelPct = (100 * nCancelled) / periodTotal;
    summaryRows.push({
      label: "Taxa de cancelamento (período)",
      value: `${cancelPct.toFixed(cancelPct < 10 && cancelPct > 0 ? 1 : 0)}%`,
      hint: `${nCancelled} de ${periodTotal} reserva(s) no período`,
    });
  }

  if (activeInPeriod > 0) {
    const donePct = (100 * nCompleted) / activeInPeriod;
    summaryRows.push({
      label: "Concluídos entre agendados ativos",
      value: `${donePct.toFixed(donePct < 10 && donePct > 0 ? 1 : 0)}%`,
      hint: "Confirmados + concluídos no período (exclui cancelados)",
    });
  }

  if (topService) {
    summaryRows.push({
      label: "Serviço mais reservado",
      value: topService.name,
      hint: `${topService.count} vez(es) no período`,
    });
  }

  if (access.permissions.viewRevenue) {
    summaryRows.push(
      {
        label: "Valor agendado (ativo no período)",
        value: `R$ ${scheduledValueInPeriod.toFixed(2)}`,
        hint: "Soma dos preços: confirmados + concluídos; data de início no período",
      },
      {
        label: "Recebido no período",
        value: `R$ ${receivedInPeriod.toFixed(2)}`,
        hint: "Soma dos serviços com data de pagamento registrada no intervalo",
      },
      {
        label: "Ainda sem pagamento registado (período)",
        value: `R$ ${unpaidValueInPeriod.toFixed(2)}`,
        hint: `${unpaidActiveInPeriod.length} reserva(s) ativa(s) no período sem pagamento registrado`,
      },
      {
        label: "Ticket médio (reserva ativa)",
        value: `R$ ${avgTicketActivePeriod.toFixed(2)}`,
        hint: "Média do preço do serviço por reserva não cancelada no período",
      },
      {
        label: "Faturamento do mês civil (concluídos)",
        value: `R$ ${revenueMonth.toFixed(2)}`,
        hint: `Só concluídos com início em ${format(monthStart, "MMMM yyyy", { locale: ptBR })}`,
      },
    );
  }

  summaryRows.push({
    label: "Concluídos sem pagamento (histórico)",
    value: String(pendingPaymentCount),
    hint: "Em todo o histórico visível para você — priorize marcar como pago",
  });

  summaryRows.push({
    label: "Clientes distintos no período",
    value: String(distinctPhonesInPeriod),
    hint: "Telefones únicos com início no período das abas",
  });

  summaryRows.push({
    label: "Clientes distintos (histórico)",
    value: String(distinctPhones.length),
    hint: "Telefones únicos em todas as reservas do seu acesso",
  });

  summaryRows.push({
    label: "Total de reservas (histórico)",
    value: String(totalCount),
    hint: "Contagem no âmbito do seu papel e filtros atuais",
  });

  const unitTelemetry = showUnitTelemetry
    ? telemetryScope === "chartPeriod"
      ? buildDashboardUnitTelemetryChartPeriod({
          units: telemetryUnits,
          periodRows: periodRows.map((r) => ({
            unitId: r.unitId,
            status: r.status,
            service: r.service,
          })),
          paidInPeriodRows: paidInPeriodRows.map((r) => ({
            unitId: r.unitId,
            service: r.service,
          })),
          viewRevenue: access.permissions.viewRevenue,
        })
      : buildDashboardUnitTelemetry({
          units: telemetryUnits,
          todayRows: telemetryTodayRows,
          weekRows: telemetryWeekRows,
          startToday,
          endToday,
          viewRevenue: access.permissions.viewRevenue,
        })
    : null;

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
      scheduledValueInPeriod,
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
    unitTelemetry,
    unitTelemetryScope: showUnitTelemetry ? telemetryScope : "todayWeek",
  };
}

const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 50;

export async function getAdminAppointmentsPaginated(
  access: StaffAccess,
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
  listFilters: AdminListFiltersParsed = {},
): Promise<{ rows: AppointmentRow[]; total: number; page: number; pageSize: number }> {
  const safeSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * safeSize;
  const whereBase = appointmentListWhere(access, listFilters);

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
