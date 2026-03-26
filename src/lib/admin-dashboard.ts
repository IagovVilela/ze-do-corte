import "server-only";

import { endOfDay, endOfWeek, format, startOfDay, startOfWeek, subDays } from "date-fns";

import { prisma } from "@/lib/prisma";
import type { AppointmentRow, DashboardPoint } from "@/lib/types";

export type AdminDashboardSnapshot = {
  metrics: {
    totalToday: number;
    totalWeek: number;
    totalAppointments: number;
  };
  series: DashboardPoint[];
  nextAppointment: {
    clientName: string;
    startsAt: Date;
  } | null;
};

export async function getAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  const now = new Date();
  const startToday = startOfDay(now);
  const endToday = endOfDay(now);
  const startWeek = startOfWeek(now, { weekStartsOn: 1 });
  const endWeek = endOfWeek(now, { weekStartsOn: 1 });
  const lastSevenDays = subDays(startToday, 6);

  const [
    appointmentsLastSeven,
    todayCount,
    weekCount,
    totalCount,
    nextAppointment,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: {
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
        startsAt: {
          gte: startToday,
          lte: endToday,
        },
      },
    }),
    prisma.appointment.count({
      where: {
        startsAt: {
          gte: startWeek,
          lte: endWeek,
        },
      },
    }),
    prisma.appointment.count(),
    prisma.appointment.findFirst({
      where: {
        startsAt: { gt: now },
        status: "CONFIRMED",
      },
      orderBy: { startsAt: "asc" },
      select: { clientName: true, startsAt: true },
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

  return {
    metrics: {
      totalToday: todayCount,
      totalWeek: weekCount,
      totalAppointments: totalCount,
    },
    series,
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
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<{ rows: AppointmentRow[]; total: number; page: number; pageSize: number }> {
  const safeSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
  const safePage = Math.max(1, page);
  const skip = (safePage - 1) * safeSize;

  const [items, total] = await Promise.all([
    prisma.appointment.findMany({
      skip,
      take: safeSize,
      orderBy: { startsAt: "desc" },
      include: { service: true },
    }),
    prisma.appointment.count(),
  ]);

  const rows: AppointmentRow[] = items.map((item) => ({
    id: item.id,
    clientName: item.clientName,
    clientPhone: item.clientPhone,
    clientEmail: item.clientEmail,
    serviceName: item.service.name,
    startsAt: item.startsAt.toISOString(),
    status: item.status,
  }));

  return { rows, total, page: safePage, pageSize: safeSize };
}
