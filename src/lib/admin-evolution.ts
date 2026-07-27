import "server-only";

import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

import { brPhoneDigits } from "@/lib/br-phone-format";
import type {
  AdminEvolutionSnapshot,
  EvolutionMonthPoint,
  EvolutionUnitSeries,
  NoPreferenceRankRow,
} from "@/lib/admin-evolution-types";
import { BARBER_TIMEZONE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { appointmentScopeWhere, type StaffAccess } from "@/lib/staff-access";

export type {
  AdminEvolutionSnapshot,
  EvolutionMonthPoint,
  EvolutionUnitSeries,
  EvolutionKpis,
  ReturnRateBlock,
  NoPreferenceRankRow,
} from "@/lib/admin-evolution-types";

function wallTimeInSp(date: Date, h: number, m: number, s: number): Date {
  const z = toZonedTime(date, BARBER_TIMEZONE);
  const local = `${format(z, "yyyy-MM-dd")}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return fromZonedTime(local, BARBER_TIMEZONE);
}

function monthKeys(
  from: Date,
  to: Date,
): { key: string; label: string; start: Date; end: Date }[] {
  const out: { key: string; label: string; start: Date; end: Date }[] = [];
  let cursor = startOfMonth(toZonedTime(from, BARBER_TIMEZONE));
  const endLimit = startOfMonth(toZonedTime(to, BARBER_TIMEZONE));
  while (cursor.getTime() <= endLimit.getTime()) {
    const monthEnd = endOfMonth(cursor);
    const start = fromZonedTime(
      `${format(cursor, "yyyy-MM-dd")}T00:00:00`,
      BARBER_TIMEZONE,
    );
    const end = fromZonedTime(
      `${format(monthEnd, "yyyy-MM-dd")}T23:59:59`,
      BARBER_TIMEZONE,
    );
    out.push({
      key: format(cursor, "yyyy-MM"),
      label: format(cursor, "MMM/yy", { locale: ptBR }),
      start,
      end,
    });
    cursor = startOfMonth(subMonths(cursor, -1));
  }
  return out;
}

function normalizePhone(phone: string): string {
  return brPhoneDigits(phone);
}

function appointmentGross(a: {
  amountPaid: { toString(): string } | number | null;
  service: { price: { toString(): string } | number };
  items: { price: { toString(): string } | number }[];
  products: { unitPrice: { toString(): string } | number; quantity: number }[];
}): number {
  const servicePart =
    a.amountPaid != null
      ? Number(a.amountPaid)
      : Number(a.service.price) +
        a.items.reduce((s, i) => s + Number(i.price), 0);
  const products = a.products.reduce(
    (s, p) => s + Number(p.unitPrice) * p.quantity,
    0,
  );
  return servicePart + products;
}

function computeReturnMetrics(
  visitsByPhone: Map<string, Date[]>,
  windowDays: number,
  now: Date,
): { rate: number } {
  const eligible = new Set<string>();
  const returned = new Set<string>();
  const cutoff = subDays(now, windowDays);

  for (const [phone, dates] of visitsByPhone) {
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    if (sorted.length === 0) continue;
    const prior = sorted.filter((d) => d.getTime() <= cutoff.getTime());
    if (prior.length === 0) continue;
    eligible.add(phone);

    let ok = false;
    for (let i = 0; i < sorted.length - 1; i++) {
      const gapDays =
        (sorted[i + 1]!.getTime() - sorted[i]!.getTime()) /
        (24 * 60 * 60 * 1000);
      if (gapDays > 0 && gapDays <= windowDays) {
        ok = true;
        break;
      }
    }
    if (ok) returned.add(phone);
  }

  const rate =
    eligible.size === 0
      ? 0
      : Math.round((returned.size / eligible.size) * 10000) / 100;
  return { rate };
}

function computeNewClientReturn(
  visitsByPhone: Map<string, Date[]>,
  windowDays: number,
  now: Date,
): number {
  const lookbackStart = subDays(now, windowDays * 2 + 30);
  const firstVisitCutoff = subDays(now, windowDays);
  let eligible = 0;
  let returned = 0;

  for (const [, dates] of visitsByPhone) {
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    const first = sorted[0];
    if (!first) continue;
    if (first.getTime() < lookbackStart.getTime()) continue;
    if (first.getTime() > firstVisitCutoff.getTime()) continue;
    eligible += 1;
    const second = sorted[1];
    if (
      second &&
      (second.getTime() - first.getTime()) / (24 * 60 * 60 * 1000) <=
        windowDays
    ) {
      returned += 1;
    }
  }

  return eligible === 0
    ? 0
    : Math.round((returned / eligible) * 10000) / 100;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function getAdminEvolutionSnapshot(
  access: StaffAccess,
  options?: {
    from?: Date;
    to?: Date;
    unitId?: string;
    rankingMonthKey?: string;
  },
): Promise<AdminEvolutionSnapshot> {
  const now = new Date();
  const to = options?.to ? endOfDay(options.to) : endOfDay(now);
  const from = options?.from
    ? startOfDay(options.from)
    : startOfDay(subMonths(to, 11));

  const scope = appointmentScopeWhere(access);
  const unitFilter = options?.unitId ? { unitId: options.unitId } : {};

  const months = monthKeys(from, to);
  const yearStartZ = startOfYear(toZonedTime(now, BARBER_TIMEZONE));
  const yearStartUtc = fromZonedTime(
    `${format(yearStartZ, "yyyy-MM-dd")}T00:00:00`,
    BARBER_TIMEZONE,
  );

  const yesterdayFrom = wallTimeInSp(subDays(now, 1), 0, 0, 0);
  const yesterdayTo = wallTimeInSp(subDays(now, 1), 23, 59, 59);
  const weekFrom = startOfDay(subDays(now, 6));
  const monthFrom = startOfDay(subDays(now, 29));

  const [paidRows, visitRows, org, units, clubSubs, kpiVisits, allPhones] =
    await Promise.all([
      prisma.appointment.findMany({
        where: {
          AND: [
            scope,
            unitFilter,
            {
              paidAt: { gte: from, lte: to },
              status: { in: ["CONFIRMED", "COMPLETED"] },
            },
          ],
        },
        select: {
          paidAt: true,
          unitId: true,
          amountPaid: true,
          service: { select: { price: true } },
          items: { select: { price: true } },
          products: { select: { unitPrice: true, quantity: true } },
        },
      }),
      prisma.appointment.findMany({
        where: {
          AND: [
            scope,
            unitFilter,
            {
              status: { in: ["CONFIRMED", "COMPLETED"] },
              startsAt: { gte: subDays(now, 180), lte: to },
            },
          ],
        },
        select: {
          clientPhone: true,
          startsAt: true,
          unitId: true,
          staffMemberId: true,
        },
      }),
      prisma.organization.findUnique({
        where: { id: access.organizationId },
        select: { ratingAvg: true, ratingCount: true },
      }),
      prisma.barbershopUnit.findMany({
        where: {
          organizationId: access.organizationId,
          isActive: true,
          ...(options?.unitId ? { id: options.unitId } : {}),
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.clientSubscription.findMany({
        where: {
          organizationId: access.organizationId,
          createdAt: { gte: from, lte: to },
        },
        select: {
          createdAt: true,
          plan: { select: { price: true } },
        },
      }),
      prisma.appointment.findMany({
        where: {
          AND: [
            scope,
            unitFilter,
            {
              status: { in: ["CONFIRMED", "COMPLETED"] },
              startsAt: { gte: yearStartUtc, lte: to },
            },
          ],
        },
        select: {
          clientPhone: true,
          startsAt: true,
          staffMemberId: true,
          bookedWithoutStaffPreference: true,
          staffMember: { select: { displayName: true, email: true } },
        },
      }),
      prisma.appointment.findMany({
        where: {
          AND: [scope, { status: { in: ["CONFIRMED", "COMPLETED"] } }],
        },
        select: { clientPhone: true, startsAt: true },
        orderBy: { startsAt: "asc" },
      }),
    ]);

  const revenueByMonth = new Map<string, number>();
  const noPrefByMonth = new Map<string, number>();
  const clubByMonth = new Map<string, number>();
  const revenueByUnitMonth = new Map<string, Map<string, number>>();

  for (const m of months) {
    revenueByMonth.set(m.key, 0);
    noPrefByMonth.set(m.key, 0);
    clubByMonth.set(m.key, 0);
  }
  for (const u of units) {
    revenueByUnitMonth.set(u.id, new Map(months.map((m) => [m.key, 0])));
  }

  for (const row of paidRows) {
    if (!row.paidAt) continue;
    const key = formatInTimeZone(row.paidAt, BARBER_TIMEZONE, "yyyy-MM");
    const amount = appointmentGross(row);
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + amount);
    if (row.unitId && revenueByUnitMonth.has(row.unitId)) {
      const um = revenueByUnitMonth.get(row.unitId)!;
      um.set(key, (um.get(key) ?? 0) + amount);
    }
  }

  const noPrefAll = await prisma.appointment.findMany({
    where: {
      AND: [
        scope,
        unitFilter,
        {
          startsAt: { gte: from, lte: to },
          status: { in: ["CONFIRMED", "COMPLETED"] },
          OR: [{ bookedWithoutStaffPreference: true }, { staffMemberId: null }],
        },
      ],
    },
    select: { startsAt: true },
  });
  for (const row of noPrefAll) {
    const key = formatInTimeZone(row.startsAt, BARBER_TIMEZONE, "yyyy-MM");
    noPrefByMonth.set(key, (noPrefByMonth.get(key) ?? 0) + 1);
  }

  for (const sub of clubSubs) {
    const key = formatInTimeZone(sub.createdAt, BARBER_TIMEZONE, "yyyy-MM");
    clubByMonth.set(
      key,
      (clubByMonth.get(key) ?? 0) + Number(sub.plan.price),
    );
  }

  const monthPoints: EvolutionMonthPoint[] = months.map((m) => ({
    key: m.key,
    label: m.label,
    revenue: round2(revenueByMonth.get(m.key) ?? 0),
    noPreference: noPrefByMonth.get(m.key) ?? 0,
    clubRevenue: round2(clubByMonth.get(m.key) ?? 0),
  }));

  const unitSeries: EvolutionUnitSeries[] = units.map((u) => ({
    unitId: u.id,
    unitName: u.name,
    months: months.map((m) => ({
      key: m.key,
      label: m.label,
      revenue: round2(revenueByUnitMonth.get(u.id)?.get(m.key) ?? 0),
    })),
  }));

  function uniqueClients(fromD: Date, toD: Date) {
    const set = new Set<string>();
    for (const a of kpiVisits) {
      if (a.startsAt < fromD || a.startsAt > toD) continue;
      set.add(normalizePhone(a.clientPhone));
    }
    return set.size;
  }

  function countServices(fromD: Date, toD: Date) {
    return kpiVisits.filter((a) => a.startsAt >= fromD && a.startsAt <= toD)
      .length;
  }

  const staffCounts = new Map<string, { name: string; n: number }>();
  for (const a of kpiVisits) {
    if (!a.staffMemberId) continue;
    const name =
      a.staffMember?.displayName?.trim() || a.staffMember?.email || "—";
    const cur = staffCounts.get(a.staffMemberId) ?? { name, n: 0 };
    cur.n += 1;
    staffCounts.set(a.staffMemberId, cur);
  }
  let topProfessionalName: string | null = null;
  let topN = 0;
  for (const v of staffCounts.values()) {
    if (v.n > topN) {
      topN = v.n;
      topProfessionalName = v.name;
    }
  }

  const phonesFirst = new Map<string, Date>();
  for (const a of allPhones) {
    const p = normalizePhone(a.clientPhone);
    if (!phonesFirst.has(p)) phonesFirst.set(p, a.startsAt);
  }
  let newClientsWeek = 0;
  for (const first of phonesFirst.values()) {
    if (first >= weekFrom && first <= to) newClientsWeek += 1;
  }

  const noPreferenceWeek = kpiVisits.filter(
    (a) =>
      a.startsAt >= weekFrom &&
      a.startsAt <= to &&
      (a.bookedWithoutStaffPreference || !a.staffMemberId),
  ).length;

  const visitsByPhone = new Map<string, Date[]>();
  const visitsByPhoneUnit = new Map<string, Map<string, Date[]>>();
  const visitsByPhoneStaff = new Map<string, Map<string, Date[]>>();

  for (const a of visitRows) {
    const p = normalizePhone(a.clientPhone);
    if (!p) continue;
    const list = visitsByPhone.get(p) ?? [];
    list.push(a.startsAt);
    visitsByPhone.set(p, list);

    if (a.unitId) {
      const byUnit = visitsByPhoneUnit.get(a.unitId) ?? new Map();
      const ul = byUnit.get(p) ?? [];
      ul.push(a.startsAt);
      byUnit.set(p, ul);
      visitsByPhoneUnit.set(a.unitId, byUnit);
    }
    if (a.staffMemberId) {
      const byStaff = visitsByPhoneStaff.get(a.staffMemberId) ?? new Map();
      const sl = byStaff.get(p) ?? [];
      sl.push(a.startsAt);
      byStaff.set(p, sl);
      visitsByPhoneStaff.set(a.staffMemberId, byStaff);
    }
  }

  const r30 = computeReturnMetrics(visitsByPhone, 30, now);
  const r60 = computeReturnMetrics(visitsByPhone, 60, now);
  const new30 = computeNewClientReturn(visitsByPhone, 30, now);
  const new60 = computeNewClientReturn(visitsByPhone, 60, now);

  let bestUnitName: string | null = null;
  let bestUnitRate = -1;
  for (const u of units) {
    const map = visitsByPhoneUnit.get(u.id);
    if (!map) continue;
    const rate = computeReturnMetrics(map, 30, now).rate;
    if (rate > bestUnitRate) {
      bestUnitRate = rate;
      bestUnitName = u.name;
    }
  }

  let bestStaffName: string | null = null;
  let bestStaffRate = -1;
  const staffIds = [...visitsByPhoneStaff.keys()];
  if (staffIds.length) {
    const staffRows = await prisma.staffMember.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, displayName: true, email: true },
    });
    const nameById = new Map(
      staffRows.map((s) => [s.id, s.displayName?.trim() || s.email]),
    );
    for (const [sid, map] of visitsByPhoneStaff) {
      const rate = computeReturnMetrics(map, 30, now).rate;
      if (rate > bestStaffRate) {
        bestStaffRate = rate;
        bestStaffName = nameById.get(sid) ?? null;
      }
    }
  }

  const rankingMonthKey =
    options?.rankingMonthKey &&
    months.some((m) => m.key === options.rankingMonthKey)
      ? options.rankingMonthKey
      : (months[months.length - 1]?.key ?? format(now, "yyyy-MM"));

  const rankingMonth = months.find((m) => m.key === rankingMonthKey);
  const rankCounts = new Map<
    string,
    { name: string; imageUrl: string | null; count: number }
  >();

  if (rankingMonth) {
    const monthNoPref = await prisma.appointment.findMany({
      where: {
        AND: [
          scope,
          unitFilter,
          {
            startsAt: { gte: rankingMonth.start, lte: rankingMonth.end },
            status: { in: ["CONFIRMED", "COMPLETED"] },
            bookedWithoutStaffPreference: true,
            staffMemberId: { not: null },
          },
        ],
      },
      select: {
        staffMemberId: true,
        staffMember: {
          select: {
            displayName: true,
            email: true,
            profileImageUrl: true,
          },
        },
      },
    });
    for (const a of monthNoPref) {
      if (!a.staffMemberId) continue;
      const cur = rankCounts.get(a.staffMemberId) ?? {
        name:
          a.staffMember?.displayName?.trim() || a.staffMember?.email || "—",
        imageUrl: a.staffMember?.profileImageUrl ?? null,
        count: 0,
      };
      cur.count += 1;
      rankCounts.set(a.staffMemberId, cur);
    }
  }

  const noPreferenceRanking: NoPreferenceRankRow[] = [...rankCounts.entries()]
    .map(([staffMemberId, v]) => ({
      staffMemberId,
      name: v.name,
      imageUrl: v.imageUrl,
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    months: monthPoints,
    unitSeries,
    kpis: {
      clientsYesterday: uniqueClients(yesterdayFrom, yesterdayTo),
      clientsWeek: uniqueClients(weekFrom, to),
      clientsMonth: uniqueClients(monthFrom, to),
      servicesYesterday: countServices(yesterdayFrom, yesterdayTo),
      servicesWeek: countServices(weekFrom, to),
      servicesMonth: countServices(monthFrom, to),
      noPreferenceWeek,
      newClientsWeek,
      ratingAvg: org?.ratingAvg != null ? Number(org.ratingAvg) : null,
      ratingCount: org?.ratingCount ?? 0,
      topProfessionalName,
      yearAppointments: kpiVisits.length,
    },
    returnRate: {
      rate30: r30.rate,
      rate60: r60.rate,
      bestUnitName,
      bestStaffName,
    },
    newClientReturn: {
      rate30: new30,
      rate60: new60,
      bestUnitName: null,
      bestStaffName: null,
    },
    lostClients: {
      rate30: Math.round((100 - new30) * 100) / 100,
      rate60: Math.round((100 - new60) * 100) / 100,
    },
    noPreferenceRanking,
    rankingMonthKey,
  };
}
