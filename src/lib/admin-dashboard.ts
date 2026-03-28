import "server-only";

import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import type { AppointmentStatus } from "@prisma/client";

import { unitNameMapByIds } from "@/lib/appointment-unit-names";
import { prisma } from "@/lib/prisma";
import { staffLabelMapByIds } from "@/lib/staff-display-names";
import { appointmentScopeWhere, type StaffAccess } from "@/lib/staff-access";
import type {
  AppointmentRow,
  DashboardPoint,
  DashboardServiceBar,
  DashboardStatusSlice,
  DashboardSummaryRow,
} from "@/lib/types";

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
  metrics: {
    totalToday: number;
    totalWeek: number;
    totalAppointments: number;
    distinctClients: number;
    /** Soma dos serviços concluídos no mês corrente (escopo do usuário). */
    revenueMonth: number;
  };
  series: DashboardPoint[];
  /** Distribuição por status no mês corrente (escopo). */
  statusSlicesMonth: DashboardStatusSlice[];
  /** Top serviços por quantidade de agendamentos no mês corrente. */
  servicesMonth: DashboardServiceBar[];
  /** Linhas para tabela-resumo. */
  summaryRows: DashboardSummaryRow[];
  /** Rótulo do mês para subtítulos (ex.: "março de 2026"). */
  monthLabel: string;
  nextAppointment: {
    clientName: string;
    startsAt: Date;
  } | null;
};

function scope(access: StaffAccess) {
  return appointmentScopeWhere(access);
}

export async function getAdminDashboardSnapshot(
  access: StaffAccess,
): Promise<AdminDashboardSnapshot> {
  const now = new Date();
  const startToday = startOfDay(now);
  const endToday = endOfDay(now);
  const startWeek = startOfWeek(now, { weekStartsOn: 1 });
  const endWeek = endOfWeek(now, { weekStartsOn: 1 });
  const lastSevenDays = subDays(startToday, 6);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const whereBase = scope(access);

  const monthWhere = {
    ...whereBase,
    startsAt: {
      gte: monthStart,
      lte: monthEnd,
    },
  };

  const [
    appointmentsLastSeven,
    todayCount,
    weekCount,
    totalCount,
    nextAppointment,
    distinctPhones,
    completedMonth,
    statusMonthCounts,
    serviceMonthCounts,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        ...whereBase,
        startsAt: {
          gte: lastSevenDays,
        },
      },
      select: { startsAt: true },
      orderBy: {
        startsAt: "asc",
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
    prisma.appointment.groupBy({
      by: ["status"],
      where: monthWhere,
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({
      by: ["serviceId"],
      where: monthWhere,
      _count: { _all: true },
    }),
  ]);

  const byDayMap = new Map<string, number>();
  for (let i = 0; i < 7; i += 1) {
    const day = subDays(startToday, 6 - i);
    byDayMap.set(format(day, "yyyy-MM-dd"), 0);
  }

  appointmentsLastSeven.forEach((appointment) => {
    const key = format(appointment.startsAt, "yyyy-MM-dd");
    byDayMap.set(key, (byDayMap.get(key) ?? 0) + 1);
  });

  const series: DashboardPoint[] = Array.from(byDayMap.entries()).map(
    ([key, count]) => ({
      date: key,
      dateLabel: format(new Date(`${key}T00:00:00`), "dd/MM"),
      count,
    }),
  );

  const revenueMonth = access.permissions.viewRevenue
    ? completedMonth.reduce(
        (sum, row) => sum + Number(row.service.price),
        0,
      )
    : 0;

  const statusCountMap = new Map(
    statusMonthCounts.map((row) => [row.status, row._count._all]),
  );
  const statusSlicesMonth: DashboardStatusSlice[] = STATUS_PIE_ORDER.map(
    (st) => ({
      name: STATUS_PIE_LABEL[st],
      value: statusCountMap.get(st) ?? 0,
      color: STATUS_PIE_COLOR[st],
    }),
  );

  const monthTotal = statusSlicesMonth.reduce((s, x) => s + x.value, 0);
  const serviceIds = [...new Set(serviceMonthCounts.map((r) => r.serviceId))];
  const serviceRows =
    serviceIds.length > 0
      ? await prisma.service.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true, name: true },
        })
      : [];
  const idToServiceName = new Map(
    serviceRows.map((s) => [s.id, s.name] as const),
  );
  const servicesMonth: DashboardServiceBar[] = serviceMonthCounts
    .map((row) => ({
      name: idToServiceName.get(row.serviceId) ?? "Serviço",
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topService = servicesMonth[0];
  const monthLabelRaw = format(monthStart, "MMMM yyyy", { locale: ptBR });
  const monthLabel =
    monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1);

  const summaryRows: DashboardSummaryRow[] = [
    {
      label: "Agendamentos no mês",
      value: String(monthTotal),
      hint: monthLabel,
    },
    {
      label: "Total no histórico (seu acesso)",
      value: String(totalCount),
    },
  ];

  if (topService) {
    summaryRows.push({
      label: "Serviço em destaque (mês)",
      value: topService.name,
      hint: `${topService.count} reserva(s)`,
    });
  }

  if (access.permissions.viewRevenue) {
    summaryRows.push({
      label: "Faturamento (concluídos no mês)",
      value: `R$ ${revenueMonth.toFixed(2)}`,
    });
  }

  summaryRows.push({
    label: "Clientes distintos (telefone)",
    value: String(distinctPhones.length),
  });

  return {
    metrics: {
      totalToday: todayCount,
      totalWeek: weekCount,
      totalAppointments: totalCount,
      distinctClients: distinctPhones.length,
      revenueMonth,
    },
    series,
    statusSlicesMonth,
    servicesMonth,
    summaryRows,
    monthLabel,
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
      // `select` + `unitNameMapByIds` — evita `include: { unit: true }` (cliente Prisma desatualizado quebra).
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        clientEmail: true,
        startsAt: true,
        status: true,
        unitId: true,
        staffMemberId: true,
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
  }));

  return { rows, total, page: safePage, pageSize: safeSize };
}
