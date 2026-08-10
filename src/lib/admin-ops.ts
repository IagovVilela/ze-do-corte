import "server-only";

import { addHours, endOfDay, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { appointmentListWhere } from "@/lib/admin-appointment-list-where";
import { BARBER_TIMEZONE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { staffLabelMapByIds } from "@/lib/staff-display-names";
import type { StaffAccess } from "@/lib/staff-access";

export type OpsKpis = {
  todayConfirmed: number;
  nextTwoHours: number;
  unpaidCompleted: number;
  clubPastDue: number;
};

export type OpsAgendaItem = {
  id: string;
  startsAt: string;
  clientName: string;
  serviceName: string;
  staffLabel: string | null;
};

export type OpsUnpaidItem = {
  id: string;
  clientName: string;
  clientPhone: string;
  startsAt: string;
  amount: number;
};

export type OpsRepeatClient = {
  phone: string;
  name: string;
  visits: number;
  value: number;
};

export type OpsClubAttention = {
  id: string;
  clientName: string;
  clientPhone: string;
  status: string;
  planName: string;
};

export type OpsBookingOrigin = {
  label: string;
  count: number;
  percent: number;
};

export type AdminOpsSnapshot = {
  kpis: OpsKpis;
  todayAgenda: OpsAgendaItem[];
  unpaid: OpsUnpaidItem[];
  topClients: OpsRepeatClient[];
  clubAttention: OpsClubAttention[];
  monthOrigins: OpsBookingOrigin[];
  lowStock: {
    id: string;
    name: string;
    stockQty: number;
    stockMin: number | null;
  }[];
  /** Clientes sumindo (60d+) — link CRM. */
  lostClientsCount: number;
};

export async function getAdminOpsSnapshot(
  access: StaffAccess,
): Promise<AdminOpsSnapshot> {
  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
    select: { timezone: true },
  });
  const tz = org?.timezone?.trim() || BARBER_TIMEZONE;
  const now = new Date();
  const zNow = toZonedTime(now, tz);
  const todayStart = fromZonedTime(startOfDay(zNow), tz);
  const todayEnd = fromZonedTime(endOfDay(zNow), tz);
  const inTwoHours = addHours(now, 2);
  const monthStart = fromZonedTime(startOfMonth(zNow), tz);
  const monthEnd = fromZonedTime(endOfMonth(zNow), tz);

  const whereBase = appointmentListWhere(access, {});

  // Lotes pequenos: evita esgotar o pool pg (timeout "when trying to connect").
  const [todayRows, unpaidRows, monthRows] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        AND: [
          whereBase,
          { startsAt: { gte: todayStart, lte: todayEnd } },
          { status: { in: ["CONFIRMED", "COMPLETED"] } },
        ],
      },
      orderBy: { startsAt: "asc" },
      take: 40,
      select: {
        id: true,
        startsAt: true,
        clientName: true,
        status: true,
        staffMemberId: true,
        service: { select: { name: true } },
        items: {
          orderBy: { sortOrder: "asc" },
          select: { service: { select: { name: true } } },
        },
      },
    }),
    prisma.appointment.findMany({
      where: {
        AND: [
          whereBase,
          { status: "COMPLETED", paidAt: null },
        ],
      },
      orderBy: { startsAt: "desc" },
      take: 8,
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        startsAt: true,
        amountPaid: true,
        service: { select: { price: true } },
        products: { select: { unitPrice: true, quantity: true } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        AND: [
          whereBase,
          { startsAt: { gte: monthStart, lte: monthEnd } },
        ],
      },
      select: {
        clientPhone: true,
        clientName: true,
        bookingSource: true,
        status: true,
        service: { select: { price: true } },
        amountPaid: true,
        paidAt: true,
      },
    }),
  ]);

  const [clubPastDue, clubAttentionRows, lowStock] = await Promise.all([
    access.permissions.manageSubscriptions
      ? prisma.clientSubscription.count({
          where: {
            organizationId: access.organizationId,
            status: "PAST_DUE",
          },
        })
      : Promise.resolve(0),
    access.permissions.manageSubscriptions
      ? prisma.clientSubscription.findMany({
          where: {
            organizationId: access.organizationId,
            status: { in: ["PAST_DUE", "PAUSED"] },
          },
          orderBy: { updatedAt: "desc" },
          take: 8,
          select: {
            id: true,
            clientName: true,
            clientPhone: true,
            status: true,
            plan: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    prisma.product.findMany({
      where: {
        organizationId: access.organizationId,
        isActive: true,
        stockQty: { not: null },
      },
      orderBy: { stockQty: "asc" },
      take: 40,
      select: { id: true, name: true, stockQty: true, stockMin: true },
    }),
  ]);

  const lostCutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const recentPhones = await prisma.appointment.findMany({
    where: {
      AND: [
        whereBase,
        { status: { in: ["CONFIRMED", "COMPLETED"] } },
        { startsAt: { gte: lostCutoff } },
      ],
    },
    select: { clientPhone: true },
    distinct: ["clientPhone"],
    take: 5000,
  });
  const allPhones = await prisma.appointment.findMany({
    where: {
      AND: [whereBase, { status: { in: ["CONFIRMED", "COMPLETED"] } }],
    },
    select: { clientPhone: true },
    distinct: ["clientPhone"],
    take: 5000,
  });
  const recentSet = new Set(
    recentPhones.map((p) => p.clientPhone.replace(/\D/g, "")),
  );
  const lostClientsCount = allPhones.filter(
    (p) => !recentSet.has(p.clientPhone.replace(/\D/g, "")),
  ).length;

  const staffLabels = await staffLabelMapByIds(
    todayRows.map((r) => r.staffMemberId),
  );

  const todayConfirmed = todayRows.filter((r) => r.status === "CONFIRMED").length;
  const nextTwoHours = todayRows.filter(
    (r) =>
      r.status === "CONFIRMED" &&
      r.startsAt >= now &&
      r.startsAt <= inTwoHours,
  ).length;

  const todayAgenda: OpsAgendaItem[] = todayRows
    .filter((r) => r.status === "CONFIRMED")
    .slice(0, 8)
    .map((r) => ({
      id: r.id,
      startsAt: r.startsAt.toISOString(),
      clientName: r.clientName,
      serviceName:
        r.items.length > 0
          ? r.items.map((i) => i.service.name).join(", ")
          : r.service.name,
      staffLabel: r.staffMemberId
        ? (staffLabels.get(r.staffMemberId) ?? null)
        : null,
    }));

  const unpaid: OpsUnpaidItem[] = unpaidRows.map((r) => {
    const products = r.products.reduce(
      (s, p) => s + Number(p.unitPrice) * p.quantity,
      0,
    );
    return {
      id: r.id,
      clientName: r.clientName,
      clientPhone: r.clientPhone,
      startsAt: r.startsAt.toISOString(),
      amount:
        r.amountPaid != null
          ? Number(r.amountPaid)
          : Number(r.service.price) + products,
    };
  });

  const byPhone = new Map<string, OpsRepeatClient>();
  for (const r of monthRows) {
    if (r.status === "CANCELLED") continue;
    const cur = byPhone.get(r.clientPhone) ?? {
      phone: r.clientPhone,
      name: r.clientName,
      visits: 0,
      value: 0,
    };
    cur.visits += 1;
    cur.value +=
      r.amountPaid != null ? Number(r.amountPaid) : Number(r.service.price);
    cur.name = r.clientName;
    byPhone.set(r.clientPhone, cur);
  }
  const topClients = [...byPhone.values()]
    .sort((a, b) => b.visits - a.visits || b.value - a.value)
    .slice(0, 8);

  const originMap = new Map<string, number>();
  for (const r of monthRows) {
    const key = (r.bookingSource ?? "").trim().toLowerCase() || "sem";
    originMap.set(key, (originMap.get(key) ?? 0) + 1);
  }
  const originTotal = monthRows.length || 1;
  const labelMap: Record<string, string> = {
    site: "Site",
    whatsapp: "WhatsApp",
    admin: "Recepção",
    sem: "Sem origem",
  };
  const monthOrigins: OpsBookingOrigin[] = [...originMap.entries()]
    .map(([k, count]) => ({
      label: labelMap[k] ?? k,
      count,
      percent: Math.round((count / originTotal) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    kpis: {
      todayConfirmed,
      nextTwoHours,
      unpaidCompleted: unpaidRows.length,
      clubPastDue,
    },
    todayAgenda,
    unpaid,
    topClients,
    clubAttention: clubAttentionRows.map((c) => ({
      id: c.id,
      clientName: c.clientName,
      clientPhone: c.clientPhone,
      status: c.status,
      planName: c.plan.name,
    })),
    monthOrigins,
    lowStock: lowStock
      .filter((p) => {
        if (p.stockQty == null) return false;
        const min = p.stockMin ?? 3;
        return p.stockQty <= min;
      })
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        name: p.name,
        stockQty: p.stockQty!,
        stockMin: p.stockMin,
      })),
    lostClientsCount,
  };
}
