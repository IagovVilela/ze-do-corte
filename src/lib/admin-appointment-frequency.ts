import "server-only";

import { eachDayOfInterval, subDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { appointmentListWhere } from "@/lib/admin-appointment-list-where";
import {
  FREQUENCY_HOUR_END,
  FREQUENCY_HOUR_START,
  type AppointmentFrequencyHeatmap,
  type FrequencyCell,
  type FrequencyFilters,
  type IsoWeekday,
} from "@/lib/admin-appointment-frequency-types";
import { BARBER_TIMEZONE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import type { StaffAccess } from "@/lib/staff-access";

export type {
  AppointmentFrequencyHeatmap,
  FrequencyCell,
  FrequencyFilters,
  IsoWeekday,
} from "@/lib/admin-appointment-frequency-types";
export {
  FREQUENCY_HOUR_END,
  FREQUENCY_HOUR_START,
} from "@/lib/admin-appointment-frequency-types";

function ymdInTz(d: Date, tz: string): string {
  return formatInTimeZone(d, tz, "yyyy-MM-dd");
}

function dayStartInShopTz(dateStr: string, tz: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return fromZonedTime(new Date(y!, m! - 1, d!, 0, 0, 0, 0), tz);
}

function dayEndInShopTz(dateStr: string, tz: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return fromZonedTime(new Date(y!, m! - 1, d!, 23, 59, 59, 999), tz);
}

/**
 * Mapa de calor: frequência de cortes por dia da semana × hora
 * nos últimos 30 dias (timezone da organização).
 */
export async function getAppointmentFrequencyHeatmap(
  access: StaffAccess,
  filters: FrequencyFilters = {},
): Promise<AppointmentFrequencyHeatmap> {
  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
    select: { timezone: true },
  });
  const tz = org?.timezone?.trim() || BARBER_TIMEZONE;

  const todayYmd = ymdInTz(new Date(), tz);
  const toDate = dayEndInShopTz(todayYmd, tz);
  const fromYmd = ymdInTz(subDays(dayStartInShopTz(todayYmd, tz), 29), tz);
  const fromDate = dayStartInShopTz(fromYmd, tz);

  const listFilters = {
    unit: filters.unitId?.trim() || undefined,
    staff: filters.staffMemberId?.trim() || undefined,
  };

  const whereBase = appointmentListWhere(access, listFilters);

  const [rows, staffCount] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        AND: [
          whereBase,
          { startsAt: { gte: fromDate, lte: toDate } },
          { status: { in: ["CONFIRMED", "COMPLETED"] } },
        ],
      },
      select: { startsAt: true },
    }),
    filters.staffMemberId?.trim()
      ? Promise.resolve(1)
      : prisma.staffMember.count({
          where: {
            organizationId: access.organizationId,
            role: { in: ["STAFF", "ADMIN", "OWNER"] },
          },
        }),
  ]);

  const capacity = Math.max(1, staffCount);

  const weekdayOccurrences: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
  };
  for (const day of eachDayOfInterval({ start: fromDate, end: toDate })) {
    const iso = Number(formatInTimeZone(day, tz, "i")) as IsoWeekday;
    weekdayOccurrences[iso] = (weekdayOccurrences[iso] ?? 0) + 1;
  }

  const counts = new Map<string, number>();
  for (const row of rows) {
    const weekday = Number(formatInTimeZone(row.startsAt, tz, "i"));
    const hour = Number(formatInTimeZone(row.startsAt, tz, "H"));
    if (hour < FREQUENCY_HOUR_START || hour > FREQUENCY_HOUR_END) continue;
    const key = `${weekday}:${hour}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const hours = Array.from(
    { length: FREQUENCY_HOUR_END - FREQUENCY_HOUR_START + 1 },
    (_, i) => FREQUENCY_HOUR_START + i,
  );
  const weekdays: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];

  const cells: FrequencyCell[] = [];
  for (const weekday of weekdays) {
    const occ = Math.max(1, weekdayOccurrences[weekday] ?? 1);
    const denom = occ * capacity;
    for (const hour of hours) {
      const count = counts.get(`${weekday}:${hour}`) ?? 0;
      const percent = Math.min(100, Math.round((count / denom) * 100));
      cells.push({ weekday, hour, count, percent });
    }
  }

  return {
    from: fromYmd,
    to: todayYmd,
    timezone: tz,
    hours,
    weekdays,
    cells,
    capacityPerWeekdayOccurrence: capacity,
    totalAppointments: rows.length,
  };
}
