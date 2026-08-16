import "server-only";

import { differenceInCalendarDays, startOfMonth } from "date-fns";

import { normalizeWaUserPhone } from "@/lib/booking-domain";
import {
  isOverdueVsUsualGap,
  usualGapDaysFromVisits,
  WINBACK_MIN_VISITS,
} from "@/lib/client-profile-math";
import { prisma } from "@/lib/prisma";

export {
  isOverdueVsUsualGap,
  usualGapDaysFromVisits,
  WINBACK_GAP_FACTOR,
  WINBACK_MIN_OVERDUE_DAYS,
  WINBACK_MIN_VISITS,
} from "@/lib/client-profile-math";

export function phoneKeyFromRaw(raw: string): string {
  return normalizeWaUserPhone(raw);
}

export async function touchClientProfileInbound(opts: {
  organizationId: string;
  phoneKey: string;
  displayName?: string | null;
  grantMarketingOptIn?: boolean;
}): Promise<void> {
  await prisma.clientProfile.upsert({
    where: {
      organizationId_phoneKey: {
        organizationId: opts.organizationId,
        phoneKey: opts.phoneKey,
      },
    },
    create: {
      organizationId: opts.organizationId,
      phoneKey: opts.phoneKey,
      displayName: opts.displayName ?? null,
      marketingOptIn: Boolean(opts.grantMarketingOptIn),
      lastInboundAt: new Date(),
    },
    update: {
      lastInboundAt: new Date(),
      ...(opts.displayName
        ? { displayName: opts.displayName }
        : {}),
      ...(opts.grantMarketingOptIn ? { marketingOptIn: true } : {}),
    },
  });
}

export async function applyMarketingOptOut(opts: {
  organizationId: string;
  phoneKey: string;
}): Promise<void> {
  await prisma.clientProfile.upsert({
    where: {
      organizationId_phoneKey: {
        organizationId: opts.organizationId,
        phoneKey: opts.phoneKey,
      },
    },
    create: {
      organizationId: opts.organizationId,
      phoneKey: opts.phoneKey,
      marketingOptIn: false,
      marketingOptOutAt: new Date(),
      lastInboundAt: new Date(),
    },
    update: {
      marketingOptIn: false,
      marketingOptOutAt: new Date(),
      lastInboundAt: new Date(),
    },
  });
}

export type WinbackCandidate = {
  phoneKey: string;
  displayName: string | null;
  visitCount: number;
  usualGapDays: number;
  daysSinceLast: number;
  lastCompletedAt: string;
};

export async function refreshOrgClientProfiles(
  organizationId: string,
): Promise<void> {
  const rows = await prisma.appointment.findMany({
    where: {
      status: "COMPLETED",
      unit: { organizationId },
    },
    select: {
      clientPhone: true,
      clientName: true,
      startsAt: true,
      staffMemberId: true,
      serviceId: true,
      unitId: true,
    },
    orderBy: { startsAt: "asc" },
    take: 12000,
  });

  const byPhone = new Map<
    string,
    {
      name: string | null;
      dates: Date[];
      lastStaff: string | null;
      lastService: string | null;
      lastUnit: string | null;
    }
  >();

  for (const r of rows) {
    const key = phoneKeyFromRaw(r.clientPhone);
    if (key.length < 12) continue;
    const cur = byPhone.get(key) ?? {
      name: r.clientName,
      dates: [],
      lastStaff: r.staffMemberId,
      lastService: r.serviceId,
      lastUnit: r.unitId,
    };
    cur.dates.push(r.startsAt);
    cur.name = r.clientName;
    cur.lastStaff = r.staffMemberId;
    cur.lastService = r.serviceId;
    cur.lastUnit = r.unitId;
    byPhone.set(key, cur);
  }

  for (const [phoneKey, info] of byPhone) {
    const last = info.dates[info.dates.length - 1]!;
    const gap = usualGapDaysFromVisits(info.dates);
    await prisma.clientProfile.upsert({
      where: {
        organizationId_phoneKey: { organizationId, phoneKey },
      },
      create: {
        organizationId,
        phoneKey,
        displayName: info.name,
        visitCount: info.dates.length,
        lastCompletedAt: last,
        usualGapDays: gap,
        preferredStaffMemberId: info.lastStaff,
        preferredServiceId: info.lastService,
        preferredUnitId: info.lastUnit,
      },
      update: {
        displayName: info.name,
        visitCount: info.dates.length,
        lastCompletedAt: last,
        usualGapDays: gap,
        preferredStaffMemberId: info.lastStaff,
        preferredServiceId: info.lastService,
        preferredUnitId: info.lastUnit,
      },
    });
  }
}

export async function listWinbackCandidates(
  organizationId: string,
  now = new Date(),
): Promise<WinbackCandidate[]> {
  await refreshOrgClientProfiles(organizationId);
  const profiles = await prisma.clientProfile.findMany({
    where: {
      organizationId,
      marketingOptOutAt: null,
      marketingOptIn: true,
      usualGapDays: { not: null },
      lastCompletedAt: { not: null },
      visitCount: { gte: WINBACK_MIN_VISITS },
    },
  });

  const out: WinbackCandidate[] = [];
  for (const p of profiles) {
    if (!p.lastCompletedAt || p.usualGapDays == null) continue;
    if (p.lastWinbackAt) {
      const since = differenceInCalendarDays(now, p.lastWinbackAt);
      if (since < 21) continue;
    }
    if (
      !isOverdueVsUsualGap({
        lastCompletedAt: p.lastCompletedAt,
        usualGapDays: p.usualGapDays,
        now,
      })
    ) {
      continue;
    }
    out.push({
      phoneKey: p.phoneKey,
      displayName: p.displayName,
      visitCount: p.visitCount,
      usualGapDays: p.usualGapDays,
      daysSinceLast: differenceInCalendarDays(now, p.lastCompletedAt),
      lastCompletedAt: p.lastCompletedAt.toISOString(),
    });
  }
  out.sort((a, b) => b.daysSinceLast - a.daysSinceLast);
  return out.slice(0, 40);
}

export async function countWinbacksThisMonth(
  organizationId: string,
  now = new Date(),
): Promise<number> {
  const from = startOfMonth(now);
  return prisma.whatsAppOutboundLog.count({
    where: {
      organizationId,
      kind: "WINBACK",
      status: "sent",
      createdAt: { gte: from },
    },
  });
}
