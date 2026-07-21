import "server-only";

import type {
  AppointmentStatus,
  OrganizationPlanStatus,
  OrganizationPlanTier,
  Prisma,
} from "@prisma/client";

import {
  buildVolumeBucketKeys,
  getDashboardPeriodMeta,
  shopCalendarDayKey,
  type DashboardPeriodMeta,
} from "@/lib/dashboard-period";
import { planStatusLabel, planTierLabel } from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";
import type { DashboardPoint, DashboardStatusSlice } from "@/lib/types";

function startOfLocalDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export type PlatformChartRange = "7d" | "30d";

export function parsePlatformChartRange(
  raw: string | undefined,
): PlatformChartRange {
  return raw === "7d" ? "7d" : "30d";
}

function platformChartPeriodMeta(
  range: PlatformChartRange,
  now = new Date(),
): DashboardPeriodMeta {
  if (range === "7d") {
    return getDashboardPeriodMeta("7d", now);
  }

  const dayStart = startOfLocalDay(now);
  const to = new Date(dayStart);
  to.setDate(to.getDate() + 1);
  to.setMilliseconds(to.getMilliseconds() - 1);

  const from = new Date(dayStart);
  from.setDate(from.getDate() - 29);

  return {
    range: "7d",
    from,
    to,
    granularity: "day",
    periodLabel: "Últimos 30 dias",
  };
}

function pct(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 1000) / 10;
}

function emptyDaySeries(meta: DashboardPeriodMeta): DashboardPoint[] {
  return buildVolumeBucketKeys(meta).map((b) => ({
    date: b.key,
    dateLabel: b.label,
    count: 0,
  }));
}

function fillDaySeries(
  meta: DashboardPeriodMeta,
  dates: Date[],
): DashboardPoint[] {
  const map = new Map<string, number>();
  for (const d of dates) {
    const key = shopCalendarDayKey(d);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return buildVolumeBucketKeys(meta).map((b) => ({
    date: b.key,
    dateLabel: b.label,
    count: map.get(b.key) ?? 0,
  }));
}

const PLAN_STATUS_COLORS: Record<OrganizationPlanStatus, string> = {
  TRIAL: "#38bdf8",
  ACTIVE: "#34d399",
  PAST_DUE: "#fbbf24",
  CANCELLED: "#fb7185",
};

const PLAN_TIER_COLORS: Record<string, string> = {
  TRIAL_FULL: "#93c5fd",
  STARTER: "#60a5fa",
  FREE: "#34d399",
  PRO: "#3b82f6",
};

export async function getPlatformOverview(
  chartRange: PlatformChartRange = "30d",
) {
  const dayStart = startOfLocalDay();
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(dayStart);
  monthStart.setDate(monthStart.getDate() - 29);
  const trial7 = new Date(dayStart);
  trial7.setDate(trial7.getDate() + 7);
  const trial14 = new Date(dayStart);
  trial14.setDate(trial14.getDate() + 14);

  const chartMeta = platformChartPeriodMeta(chartRange);

  const [
    orgTotal,
    byStatus,
    byTier,
    marketplaceOn,
    appointmentsToday,
    appointments7d,
    appointments30d,
    trialsEnding7,
    trialsEnding14,
    reviewAgg,
    recentOrgs,
    orgsInPeriod,
    apptsInPeriod,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.groupBy({
      by: ["planStatus"],
      _count: { _all: true },
    }),
    prisma.organization.groupBy({
      by: ["planTier"],
      _count: { _all: true },
    }),
    prisma.organization.count({ where: { marketplaceListed: true } }),
    prisma.appointment.count({
      where: {
        startsAt: { gte: dayStart, lt: dayEnd },
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
    }),
    prisma.appointment.count({
      where: {
        startsAt: { gte: weekStart, lt: dayEnd },
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
    }),
    prisma.appointment.count({
      where: {
        startsAt: { gte: monthStart, lt: dayEnd },
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
    }),
    prisma.organization.count({
      where: {
        planStatus: "TRIAL",
        trialEndsAt: { gte: dayStart, lte: trial7 },
      },
    }),
    prisma.organization.count({
      where: {
        planStatus: "TRIAL",
        trialEndsAt: { gte: dayStart, lte: trial14 },
      },
    }),
    prisma.organizationReview.aggregate({
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        planStatus: true,
        planTier: true,
        createdAt: true,
      },
    }),
    prisma.organization.findMany({
      where: {
        createdAt: { gte: chartMeta.from, lte: chartMeta.to },
      },
      select: { createdAt: true },
    }),
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: chartMeta.from, lte: chartMeta.to },
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
      select: { startsAt: true },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const row of byStatus) {
    statusMap[row.planStatus] = row._count._all;
  }
  const tierMap: Record<string, number> = {};
  for (const row of byTier) {
    tierMap[row.planTier] = row._count._all;
  }

  const trial = statusMap.TRIAL ?? 0;
  const active = statusMap.ACTIVE ?? 0;
  const pastDue = statusMap.PAST_DUE ?? 0;
  const cancelled = statusMap.CANCELLED ?? 0;

  const planStatusMix: DashboardStatusSlice[] = (
    ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED"] as OrganizationPlanStatus[]
  )
    .map((status) => ({
      name: planStatusLabel(status),
      value: statusMap[status] ?? 0,
      color: PLAN_STATUS_COLORS[status],
    }))
    .filter((s) => s.value > 0);

  const planTierMix: DashboardStatusSlice[] = Object.entries(tierMap).map(
    ([tier, value]) => ({
      name: planTierLabel(tier as OrganizationPlanTier),
      value,
      color: PLAN_TIER_COLORS[tier] ?? "#94a3b8",
    }),
  );

  const orgsSeries =
    orgsInPeriod.length > 0
      ? fillDaySeries(
          chartMeta,
          orgsInPeriod.map((o) => o.createdAt),
        )
      : emptyDaySeries(chartMeta);

  const appointmentsSeries =
    apptsInPeriod.length > 0
      ? fillDaySeries(
          chartMeta,
          apptsInPeriod.map((a) => a.startsAt),
        )
      : emptyDaySeries(chartMeta);

  return {
    organizations: {
      total: orgTotal,
      trial,
      active,
      pastDue,
      cancelled,
      marketplaceListed: marketplaceOn,
      trialsEnding7d: trialsEnding7,
      trialsEnding14d: trialsEnding14,
      byTier: tierMap,
    },
    rates: {
      marketplacePct: pct(marketplaceOn, orgTotal),
      activePct: pct(active, orgTotal),
      cancelledPct: pct(cancelled, orgTotal),
      trialPct: pct(trial, orgTotal),
    },
    appointments: {
      today: appointmentsToday,
      last7Days: appointments7d,
      last30Days: appointments30d,
    },
    reviews: {
      total: reviewAgg._count._all,
      avgRating:
        reviewAgg._avg.rating != null
          ? Math.round(Number(reviewAgg._avg.rating) * 10) / 10
          : null,
    },
    charts: {
      range: chartRange,
      periodLabel: chartMeta.periodLabel,
      organizationsSeries: orgsSeries,
      appointmentsSeries,
      planStatusMix,
      planTierMix,
    },
    recentOrganizations: recentOrgs.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
    })),
  };
}

export type PlatformOrgListFilters = {
  q?: string;
  planStatus?: OrganizationPlanStatus;
  planTier?: OrganizationPlanTier;
};

export async function listPlatformOrganizations(
  filters: PlatformOrgListFilters = {},
) {
  const q = filters.q?.trim() ?? "";
  const where: Prisma.OrganizationWhereInput = {
    ...(filters.planStatus ? { planStatus: filters.planStatus } : {}),
    ...(filters.planTier ? { planTier: filters.planTier } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const rows = await prisma.organization.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      slug: true,
      planStatus: true,
      planTier: true,
      trialEndsAt: true,
      marketplaceListed: true,
      ratingAvg: true,
      ratingCount: true,
      createdAt: true,
      staffMembers: {
        where: { role: "OWNER" },
        take: 3,
        select: { id: true, email: true, displayName: true },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: {
          units: true,
          staffMembers: true,
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    planStatus: r.planStatus,
    planTier: r.planTier,
    trialEndsAt: r.trialEndsAt?.toISOString() ?? null,
    marketplaceListed: r.marketplaceListed,
    ratingAvg: r.ratingAvg != null ? Number(r.ratingAvg) : null,
    ratingCount: r.ratingCount,
    createdAt: r.createdAt.toISOString(),
    owners: r.staffMembers,
    unitCount: r._count.units,
    staffCount: r._count.staffMembers,
  }));
}

export async function getPlatformOrganizationDetail(id: string) {
  const org = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      planStatus: true,
      planTier: true,
      trialEndsAt: true,
      marketplaceListed: true,
      ratingAvg: true,
      ratingCount: true,
      createdAt: true,
      updatedAt: true,
      asaasCustomerId: true,
      asaasSubscriptionId: true,
      asaasEnabled: true,
      asaasAccountEmail: true,
      timezone: true,
      primaryColor: true,
      logoUrl: true,
      staffMembers: {
        where: { role: { in: ["OWNER", "ADMIN"] } },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          createdAt: true,
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
      units: {
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          addressLine: true,
          isActive: true,
          isDefault: true,
          _count: { select: { services: true, appointments: true } },
        },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      },
      _count: {
        select: {
          staffMembers: true,
          units: true,
          clientSubscriptions: true,
          reviews: true,
        },
      },
    },
  });

  if (!org) return null;

  const appointmentCount = await prisma.appointment.count({
    where: {
      OR: [
        { unit: { organizationId: id } },
        { service: { unit: { organizationId: id } } },
      ],
    },
  });

  return {
    ...org,
    trialEndsAt: org.trialEndsAt?.toISOString() ?? null,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
    ratingAvg: org.ratingAvg != null ? Number(org.ratingAvg) : null,
    appointmentCount,
    units: org.units.map((u) => ({
      ...u,
      serviceCount: u._count.services,
      appointmentCount: u._count.appointments,
    })),
  };
}

export async function getPlatformMarketplaceSnapshot() {
  const [shops, reviews] = await Promise.all([
    prisma.organization.findMany({
      where: { marketplaceListed: true },
      orderBy: [{ ratingCount: "desc" }, { name: "asc" }],
      take: 100,
      select: {
        id: true,
        name: true,
        slug: true,
        planStatus: true,
        planTier: true,
        ratingAvg: true,
        ratingCount: true,
        marketplaceListed: true,
        units: {
          where: { isDefault: true },
          take: 1,
          select: { city: true },
        },
      },
    }),
    prisma.organizationReview.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        rating: true,
        comment: true,
        clientName: true,
        clientPhone: true,
        createdAt: true,
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
  ]);

  return {
    shops: shops.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      planStatus: s.planStatus,
      planTier: s.planTier,
      ratingAvg: s.ratingAvg != null ? Number(s.ratingAvg) : null,
      ratingCount: s.ratingCount,
      marketplaceListed: s.marketplaceListed,
      city: s.units[0]?.city ?? null,
    })),
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      clientName: r.clientName,
      clientPhone: r.clientPhone,
      createdAt: r.createdAt.toISOString(),
      organization: r.organization,
    })),
  };
}

export async function deletePlatformReview(reviewId: string) {
  const review = await prisma.organizationReview.findUnique({
    where: { id: reviewId },
    select: { id: true, organizationId: true },
  });
  if (!review) return false;

  await prisma.$transaction(async (tx) => {
    await tx.organizationReview.delete({ where: { id: reviewId } });
    const agg = await tx.organizationReview.aggregate({
      where: { organizationId: review.organizationId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await tx.organization.update({
      where: { id: review.organizationId },
      data: {
        ratingAvg: agg._count._all > 0 ? (agg._avg.rating ?? null) : null,
        ratingCount: agg._count._all,
      },
    });
  });

  return true;
}

export type PlatformConsumersFilters = {
  q?: string;
  organizationId?: string;
  days?: number;
  skip?: number;
  take?: number;
};

export async function listPlatformConsumers(
  filters: PlatformConsumersFilters = {},
) {
  const q = filters.q?.trim() ?? "";
  const take = Math.min(Math.max(filters.take ?? 50, 1), 100);
  const skip = Math.max(filters.skip ?? 0, 0);
  const days = filters.days ?? 30;
  const from = startOfLocalDay();
  from.setDate(from.getDate() - (days - 1));

  const where: Prisma.AppointmentWhereInput = {
    startsAt: { gte: from },
    ...(filters.organizationId
      ? {
          OR: [
            { unit: { organizationId: filters.organizationId } },
            { service: { unit: { organizationId: filters.organizationId } } },
          ],
        }
      : {}),
    ...(q
      ? {
          OR: [
            { clientName: { contains: q, mode: "insensitive" } },
            { clientPhone: { contains: q } },
            { clientEmail: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: { startsAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        clientEmail: true,
        status: true,
        startsAt: true,
        unit: {
          select: {
            organizationId: true,
            organization: { select: { id: true, name: true, slug: true } },
          },
        },
        service: {
          select: {
            name: true,
            unit: {
              select: {
                organizationId: true,
                organization: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    total,
    skip,
    take,
    appointments: rows.map((a) => {
      const org =
        a.unit?.organization ?? a.service.unit.organization ?? null;
      return {
        id: a.id,
        clientName: a.clientName,
        clientPhone: a.clientPhone,
        clientEmail: a.clientEmail,
        status: a.status as AppointmentStatus,
        startsAt: a.startsAt.toISOString(),
        serviceName: a.service.name,
        organization: org
          ? { id: org.id, name: org.name, slug: org.slug }
          : null,
      };
    }),
  };
}
