import "server-only";

import {
  getAdminDashboardSnapshot,
  type AdminDashboardSnapshot,
  type DashboardRange,
} from "@/lib/admin-dashboard";
import type { AdminListFiltersParsed } from "@/lib/admin-list-url";
import { getDashboardPeriodMeta } from "@/lib/dashboard-period";
import { prisma } from "@/lib/prisma";
import { staffLabelMapByIds } from "@/lib/staff-display-names";
import type { StaffAccess } from "@/lib/staff-access";
import { appointmentListWhere } from "@/lib/admin-appointment-list-where";

export type BookingOriginSlice = {
  source: string;
  label: string;
  count: number;
  percent: number;
};

export type StaffRankingRow = {
  staffId: string | null;
  label: string;
  appointments: number;
  completed: number;
  cancelled: number;
  received: number;
};

export type ClubReportStats = {
  active: number;
  pastDue: number;
  paused: number;
  cancelled: number;
};

export type AdminReportsSnapshot = AdminDashboardSnapshot & {
  bookingOrigins: BookingOriginSlice[];
  staffRanking: StaffRankingRow[];
  club: ClubReportStats | null;
  productRevenueInPeriod: number;
  cancelRate: number;
  completionRate: number;
  avgTicket: number;
};

function originLabel(raw: string | null): string {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "site") return "Site";
  if (s === "whatsapp") return "WhatsApp";
  if (s === "admin") return "Recepção / painel";
  if (!s) return "Sem origem";
  return raw!.trim();
}

export async function getAdminReportsSnapshot(
  access: StaffAccess,
  range: DashboardRange,
  listFilters: AdminListFiltersParsed = {},
): Promise<AdminReportsSnapshot> {
  const base = await getAdminDashboardSnapshot(
    access,
    range,
    listFilters,
    "chartPeriod",
  );
  const meta = getDashboardPeriodMeta(range, new Date());
  const whereBase = appointmentListWhere(access, listFilters);

  const periodRows = await prisma.appointment.findMany({
    where: {
      AND: [
        whereBase,
        { startsAt: { gte: meta.from, lte: meta.to } },
      ],
    },
    select: {
      status: true,
      bookingSource: true,
      staffMemberId: true,
      paidAt: true,
      amountPaid: true,
      service: { select: { price: true } },
      products: { select: { unitPrice: true, quantity: true, soldAt: true } },
    },
  });

  const originCounts = new Map<string, number>();
  const staffAgg = new Map<
    string,
    {
      appointments: number;
      completed: number;
      cancelled: number;
      received: number;
    }
  >();

  let productRevenueInPeriod = 0;

  for (const row of periodRows) {
    const key = row.bookingSource?.trim() || "";
    originCounts.set(key, (originCounts.get(key) ?? 0) + 1);

    const sid = row.staffMemberId ?? "__none__";
    const agg = staffAgg.get(sid) ?? {
      appointments: 0,
      completed: 0,
      cancelled: 0,
      received: 0,
    };
    agg.appointments += 1;
    if (row.status === "COMPLETED") agg.completed += 1;
    if (row.status === "CANCELLED") agg.cancelled += 1;
    if (row.paidAt && row.paidAt >= meta.from && row.paidAt <= meta.to) {
      agg.received +=
        row.amountPaid != null
          ? Number(row.amountPaid)
          : Number(row.service.price);
    }
    staffAgg.set(sid, agg);

    for (const p of row.products) {
      if (p.soldAt >= meta.from && p.soldAt <= meta.to) {
        productRevenueInPeriod += Number(p.unitPrice) * p.quantity;
      }
    }
  }

  const originTotal = periodRows.length || 1;
  const bookingOrigins: BookingOriginSlice[] = [...originCounts.entries()]
    .map(([source, count]) => ({
      source,
      label: originLabel(source),
      count,
      percent: Math.round((count / originTotal) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  const staffIds = [...staffAgg.keys()]
    .filter((k) => k !== "__none__")
    .map((k) => k);
  const labels = await staffLabelMapByIds(staffIds);

  const staffRanking: StaffRankingRow[] = [...staffAgg.entries()]
    .map(([id, v]) => ({
      staffId: id === "__none__" ? null : id,
      label:
        id === "__none__"
          ? "Sem profissional"
          : (labels.get(id) ?? "Profissional"),
      ...v,
    }))
    .sort((a, b) => b.appointments - a.appointments)
    .slice(0, 12);

  let club: ClubReportStats | null = null;
  if (access.permissions.manageSubscriptions) {
    const groups = await prisma.clientSubscription.groupBy({
      by: ["status"],
      where: { organizationId: access.organizationId },
      _count: { _all: true },
    });
    club = { active: 0, pastDue: 0, paused: 0, cancelled: 0 };
    for (const g of groups) {
      const n = g._count._all;
      if (g.status === "ACTIVE") club.active = n;
      else if (g.status === "PAST_DUE") club.pastDue = n;
      else if (g.status === "PAUSED") club.paused = n;
      else if (g.status === "CANCELLED") club.cancelled = n;
    }
  }

  const total = periodRows.length;
  const cancelled = periodRows.filter((r) => r.status === "CANCELLED").length;
  const completed = periodRows.filter((r) => r.status === "COMPLETED").length;
  const cancelRate = total ? Math.round((cancelled / total) * 1000) / 10 : 0;
  const completionRate = total
    ? Math.round((completed / total) * 1000) / 10
    : 0;
  const avgTicket =
    completed > 0
      ? Math.round(
          (base.metrics.completedValueInPeriod / completed) * 100,
        ) / 100
      : 0;

  return {
    ...base,
    bookingOrigins,
    staffRanking,
    club,
    productRevenueInPeriod,
    cancelRate,
    completionRate,
    avgTicket,
  };
}
