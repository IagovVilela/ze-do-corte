import "server-only";

import { brPhoneDigits, formatBrPhoneNational } from "@/lib/br-phone-format";
import type {
  AdminCrmClientRow,
  AdminCrmClubStatus,
  AdminCrmRisk,
  AdminCrmSnapshot,
} from "@/lib/admin-crm-types";
import {
  crmWinBackWhatsAppText,
  phoneToWhatsAppHref,
} from "@/lib/phone-to-whatsapp-link";
import { prisma } from "@/lib/prisma";
import {
  appointmentScopeWhere,
  type StaffAccess,
} from "@/lib/staff-access";

export type { AdminCrmClientRow, AdminCrmSnapshot } from "@/lib/admin-crm-types";

type Agg = {
  name: string;
  phoneRaw: string;
  email: string | null;
  lastVisitAt: Date | null;
  lastBookedAt: Date | null;
  visitCount: number;
  bookingCount: number;
  totalSpent: number;
  lastServiceName: string | null;
};

const CLUB_RANK: Record<Exclude<AdminCrmClubStatus, null>, number> = {
  ACTIVE: 4,
  PAST_DUE: 3,
  PAUSED: 2,
  CANCELLED: 1,
};

const RISK_RANK: Record<AdminCrmRisk, number> = {
  lost: 3,
  at_risk: 2,
  ok: 1,
};

function pickBetterClub(
  a: { status: AdminCrmClubStatus; planName: string | null },
  b: { status: AdminCrmClubStatus; planName: string | null },
) {
  const ra = a.status ? CLUB_RANK[a.status] : 0;
  const rb = b.status ? CLUB_RANK[b.status] : 0;
  return rb > ra ? b : a;
}

function matchesQuery(row: AdminCrmClientRow, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const digits = needle.replace(/\D/g, "");
  if (row.name.toLowerCase().includes(needle)) return true;
  if (row.phone.toLowerCase().includes(needle)) return true;
  if (row.email?.toLowerCase().includes(needle)) return true;
  if (digits.length >= 3 && row.phoneKey.includes(digits)) return true;
  if (row.clubPlanName?.toLowerCase().includes(needle)) return true;
  return false;
}

/** Alinhado à Evolução: &lt;30 ok · 30–59 risco · ≥60 sumindo. */
export function crmRiskFromActivity(
  lastVisitAt: Date | null,
  lastBookedAt: Date | null,
  now = new Date(),
): { risk: AdminCrmRisk; daysSinceLastActivity: number | null } {
  const ref = lastVisitAt ?? lastBookedAt;
  if (!ref) {
    return { risk: "lost", daysSinceLastActivity: null };
  }
  const ms = now.getTime() - ref.getTime();
  const days = Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
  if (days >= 60) return { risk: "lost", daysSinceLastActivity: days };
  if (days >= 30) return { risk: "at_risk", daysSinceLastActivity: days };
  return { risk: "ok", daysSinceLastActivity: days };
}

/**
 * CRM do salão: clientes únicos por telefone (agenda + clube).
 */
export async function getAdminCrmSnapshot(
  access: StaffAccess,
  options?: {
    q?: string;
    clubFilter?: "all" | "club" | "none";
    riskFilter?: "all" | "at_risk" | "lost" | "actionable";
    sort?: "lastVisit" | "spent" | "name" | "visits" | "risk";
    page?: number;
    pageSize?: number;
  },
): Promise<AdminCrmSnapshot> {
  const canViewRevenue = access.permissions.viewRevenue;
  const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 30));
  const page = Math.max(1, options?.page ?? 1);
  const q = (options?.q ?? "").trim();
  const clubFilter = options?.clubFilter ?? "all";
  const riskFilter = options?.riskFilter ?? "all";
  const sort = options?.sort ?? "lastVisit";
  const now = new Date();

  const [appointments, subscriptions] = await Promise.all([
    prisma.appointment.findMany({
      where: appointmentScopeWhere(access),
      select: {
        clientName: true,
        clientPhone: true,
        clientEmail: true,
        startsAt: true,
        status: true,
        amountPaid: true,
        paymentStatus: true,
        service: { select: { name: true } },
        items: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { service: { select: { name: true } } },
        },
      },
      orderBy: { startsAt: "desc" },
      take: 8000,
    }),
    prisma.clientSubscription.findMany({
      where: { organizationId: access.organizationId },
      select: {
        clientName: true,
        clientPhone: true,
        clientEmail: true,
        status: true,
        plan: { select: { name: true } },
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 3000,
    }),
  ]);

  const byPhone = new Map<string, Agg>();

  for (const row of appointments) {
    const key = brPhoneDigits(row.clientPhone);
    if (key.length < 10) continue;

    let agg = byPhone.get(key);
    if (!agg) {
      agg = {
        name: row.clientName.trim() || "Cliente",
        phoneRaw: row.clientPhone,
        email: row.clientEmail?.trim() || null,
        lastVisitAt: null,
        lastBookedAt: null,
        visitCount: 0,
        bookingCount: 0,
        totalSpent: 0,
        lastServiceName: null,
      };
      byPhone.set(key, agg);
    }

    // Já ordenado por startsAt desc → primeiro registro define nome/e-mail recentes.
    if (!agg.lastBookedAt && row.status !== "CANCELLED") {
      agg.lastBookedAt = row.startsAt;
      if (row.clientName.trim()) agg.name = row.clientName.trim();
      if (row.clientEmail?.trim()) agg.email = row.clientEmail.trim();
    }

    if (row.status === "CANCELLED") continue;

    agg.bookingCount += 1;

    if (row.status === "COMPLETED") {
      agg.visitCount += 1;
      if (!agg.lastVisitAt) {
        agg.lastVisitAt = row.startsAt;
        const fromItem = row.items[0]?.service.name?.trim();
        agg.lastServiceName =
          fromItem || row.service.name?.trim() || null;
      }
    }

    if (
      canViewRevenue &&
      row.paymentStatus === "PAID" &&
      row.amountPaid != null
    ) {
      agg.totalSpent += Number(row.amountPaid);
    }
  }

  // Inclui assinantes do clube que ainda não aparecem na agenda (escopo org).
  const clubByPhone = new Map<
    string,
    {
      status: AdminCrmClubStatus;
      planName: string | null;
      name: string;
      email: string | null;
      phoneRaw: string;
    }
  >();

  for (const sub of subscriptions) {
    const key = brPhoneDigits(sub.clientPhone);
    if (key.length < 10) continue;
    const next = {
      status: sub.status as AdminCrmClubStatus,
      planName: sub.plan.name,
      name: sub.clientName.trim() || "Cliente",
      email: sub.clientEmail?.trim() || null,
      phoneRaw: sub.clientPhone,
    };
    const prev = clubByPhone.get(key);
    if (!prev) {
      clubByPhone.set(key, next);
    } else {
      const better = pickBetterClub(
        { status: prev.status, planName: prev.planName },
        { status: next.status, planName: next.planName },
      );
      clubByPhone.set(key, {
        ...next,
        status: better.status,
        planName: better.planName,
        name: prev.name || next.name,
        email: prev.email || next.email,
      });
    }

    if (!byPhone.has(key)) {
      // STAFF só vê clientes da sua agenda; não injeta assinante só de clube.
      if (access.role === "STAFF") continue;
      byPhone.set(key, {
        name: next.name,
        phoneRaw: next.phoneRaw,
        email: next.email,
        lastVisitAt: null,
        lastBookedAt: null,
        visitCount: 0,
        bookingCount: 0,
        totalSpent: 0,
        lastServiceName: null,
      });
    }
  }

  let clients: AdminCrmClientRow[] = [...byPhone.entries()].map(
    ([phoneKey, agg]) => {
      const club = clubByPhone.get(phoneKey);
      const phone = formatBrPhoneNational(agg.phoneRaw) || agg.phoneRaw;
      const { risk, daysSinceLastActivity } = crmRiskFromActivity(
        agg.lastVisitAt,
        agg.lastBookedAt,
        now,
      );
      return {
        phoneKey,
        name: agg.name,
        phone,
        email: agg.email,
        lastVisitAt: agg.lastVisitAt?.toISOString() ?? null,
        lastBookedAt: agg.lastBookedAt?.toISOString() ?? null,
        visitCount: agg.visitCount,
        bookingCount: agg.bookingCount,
        totalSpent: canViewRevenue
          ? Math.round(agg.totalSpent * 100) / 100
          : null,
        clubStatus: club?.status ?? null,
        clubPlanName: club?.planName ?? null,
        whatsappHref: phoneToWhatsAppHref(agg.phoneRaw),
        whatsappWinBackHref: phoneToWhatsAppHref(
          agg.phoneRaw,
          crmWinBackWhatsAppText(agg.name),
        ),
        risk,
        daysSinceLastActivity,
        lastServiceName: agg.lastServiceName,
      };
    },
  );

  const atRiskCount = clients.filter((c) => c.risk === "at_risk").length;
  const lostCount = clients.filter((c) => c.risk === "lost").length;

  const actionQueue = [...clients]
    .filter((c) => c.risk === "lost" || c.risk === "at_risk")
    .sort(
      (a, b) =>
        RISK_RANK[b.risk] - RISK_RANK[a.risk] ||
        (b.daysSinceLastActivity ?? 9999) - (a.daysSinceLastActivity ?? 9999),
    )
    .slice(0, 8);

  clients = clients.filter((c) => matchesQuery(c, q));

  if (clubFilter === "club") {
    clients = clients.filter(
      (c) =>
        c.clubStatus === "ACTIVE" ||
        c.clubStatus === "PAST_DUE" ||
        c.clubStatus === "PAUSED",
    );
  } else if (clubFilter === "none") {
    clients = clients.filter(
      (c) => c.clubStatus == null || c.clubStatus === "CANCELLED",
    );
  }

  if (riskFilter === "at_risk") {
    clients = clients.filter((c) => c.risk === "at_risk");
  } else if (riskFilter === "lost") {
    clients = clients.filter((c) => c.risk === "lost");
  } else if (riskFilter === "actionable") {
    clients = clients.filter(
      (c) => c.risk === "at_risk" || c.risk === "lost",
    );
  }

  const totalFiltered = clients.length;

  clients.sort((a, b) => {
    switch (sort) {
      case "name":
        return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
      case "visits":
        return (
          b.visitCount - a.visitCount ||
          a.name.localeCompare(b.name, "pt-BR")
        );
      case "spent": {
        const sa = a.totalSpent ?? 0;
        const sb = b.totalSpent ?? 0;
        return sb - sa || a.name.localeCompare(b.name, "pt-BR");
      }
      case "risk":
        return (
          RISK_RANK[b.risk] - RISK_RANK[a.risk] ||
          (b.daysSinceLastActivity ?? 9999) -
            (a.daysSinceLastActivity ?? 9999) ||
          a.name.localeCompare(b.name, "pt-BR")
        );
      case "lastVisit":
      default: {
        const ta = a.lastVisitAt ?? a.lastBookedAt ?? "";
        const tb = b.lastVisitAt ?? b.lastBookedAt ?? "";
        return tb.localeCompare(ta) || a.name.localeCompare(b.name, "pt-BR");
      }
    }
  });

  const skip = (page - 1) * pageSize;
  const pageClients = clients.slice(skip, skip + pageSize);

  const clubActive = [...clubByPhone.values()].filter(
    (c) => c.status === "ACTIVE",
  ).length;

  const totalSpentAll = canViewRevenue
    ? Math.round(
        [...byPhone.values()].reduce((s, a) => s + a.totalSpent, 0) * 100,
      ) / 100
    : null;

  return {
    totalClients: byPhone.size,
    clubActive,
    atRiskCount,
    lostCount,
    totalSpent: totalSpentAll,
    canViewRevenue,
    page,
    pageSize,
    totalFiltered,
    q,
    clubFilter,
    riskFilter,
    sort,
    actionQueue,
    clients: pageClients,
  };
}
