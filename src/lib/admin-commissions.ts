import "server-only";

import { endOfDay, startOfDay } from "date-fns";

import { computeFinanceNetAmount } from "@/lib/admin-finance";
import { prisma } from "@/lib/prisma";

const DEFAULT_SERVICE_PCT = 50;
const DEFAULT_SUB_PCT = 30;
const DEFAULT_PRODUCT_PCT = 10;

export type CommissionRow = {
  staffMemberId: string;
  professionalName: string;
  avulsoGross: number;
  avulsoNet: number;
  subscriptionGross: number;
  subscriptionNet: number;
  productsGross: number;
  productsNet: number;
  bonus: number;
  advances: number;
  totalGross: number;
  totalNet: number;
  servicePercent: number;
  subscriptionPercent: number;
  productPercent: number;
};

function appointmentServiceGross(a: {
  amountPaid: { toString(): string } | number | null;
  usedSubscriptionId: string | null;
  service: { price: { toString(): string } | number };
  items: { price: { toString(): string } | number }[];
}): number {
  if (a.amountPaid != null) return Number(a.amountPaid);
  return (
    Number(a.service.price) +
    a.items.reduce((s, i) => s + Number(i.price), 0)
  );
}

/**
 * Snapshot de comissões no período (estilo Cash Barber).
 * `potPercent` = fatia do faturamento de assinatura/clube destinada ao rateio.
 */
export async function getCommissionsSnapshot(options: {
  organizationId: string;
  from: Date;
  to: Date;
  potPercent?: number;
  unitId?: string;
}): Promise<{
  from: string;
  to: string;
  subscriptionRevenue: number;
  potPercent: number;
  potAmount: number;
  rows: CommissionRow[];
}> {
  const from = startOfDay(options.from);
  const to = endOfDay(options.to);
  const potPercent = Math.min(
    100,
    Math.max(0, options.potPercent ?? DEFAULT_SUB_PCT),
  );

  const staff = await prisma.staffMember.findMany({
    where: {
      organizationId: options.organizationId,
      role: "STAFF",
      ...(options.unitId ? { unitId: options.unitId } : {}),
    },
    select: {
      id: true,
      displayName: true,
      email: true,
      commissionRule: true,
    },
    orderBy: [{ displayName: "asc" }, { email: "asc" }],
  });

  const appointments = await prisma.appointment.findMany({
    where: {
      unit: { organizationId: options.organizationId },
      ...(options.unitId ? { unitId: options.unitId } : {}),
      paidAt: { gte: from, lte: to },
      status: { in: ["CONFIRMED", "COMPLETED"] },
      staffMemberId: { not: null },
    },
    select: {
      staffMemberId: true,
      amountPaid: true,
      usedSubscriptionId: true,
      service: { select: { price: true } },
      items: { select: { price: true } },
      products: { select: { quantity: true, unitPrice: true } },
    },
  });

  const clubPaid = await prisma.clientSubscription.findMany({
    where: {
      organizationId: options.organizationId,
      status: { in: ["ACTIVE", "PAST_DUE", "CANCELLED", "PAUSED"] },
      updatedAt: { gte: from, lte: to },
    },
    select: {
      plan: { select: { price: true } },
    },
  });

  // Proxy de receita de assinatura no período: planos atualizados + atendimentos com crédito de clube.
  let subscriptionRevenue = clubPaid.reduce(
    (s, c) => s + Number(c.plan.price),
    0,
  );
  for (const a of appointments) {
    if (a.usedSubscriptionId) {
      subscriptionRevenue += appointmentServiceGross(a);
    }
  }

  const potAmount = Math.round(subscriptionRevenue * (potPercent / 100) * 100) / 100;

  const adjustments = await prisma.staffFinanceAdjustment.findMany({
    where: {
      organizationId: options.organizationId,
      occurredAt: { gte: from, lte: to },
      staffMemberId: { in: staff.map((s) => s.id) },
    },
    select: {
      staffMemberId: true,
      kind: true,
      amount: true,
    },
  });

  const byStaff = new Map<
    string,
    {
      avulsoGross: number;
      subscriptionGross: number;
      productsGross: number;
      bonus: number;
      advances: number;
    }
  >();

  for (const s of staff) {
    byStaff.set(s.id, {
      avulsoGross: 0,
      subscriptionGross: 0,
      productsGross: 0,
      bonus: 0,
      advances: 0,
    });
  }

  for (const a of appointments) {
    const id = a.staffMemberId;
    if (!id) continue;
    const bucket = byStaff.get(id);
    if (!bucket) continue;
    const serviceGross = appointmentServiceGross(a);
    if (a.usedSubscriptionId) {
      bucket.subscriptionGross += serviceGross;
    } else {
      bucket.avulsoGross += serviceGross;
    }
    bucket.productsGross += a.products.reduce(
      (sum, p) => sum + Number(p.unitPrice) * p.quantity,
      0,
    );
  }

  for (const adj of adjustments) {
    const bucket = byStaff.get(adj.staffMemberId);
    if (!bucket) continue;
    const n = Number(adj.amount);
    if (adj.kind === "BONUS") bucket.bonus += n;
    else bucket.advances += n;
  }

  const activeWithSub = staff.filter((s) => {
    const b = byStaff.get(s.id)!;
    return b.subscriptionGross > 0;
  });
  const subShareBase =
    activeWithSub.length > 0
      ? activeWithSub
      : staff.filter((s) => {
          const b = byStaff.get(s.id)!;
          return b.avulsoGross + b.productsGross > 0;
        });
  const potPerStaff =
    subShareBase.length > 0
      ? potAmount / subShareBase.length
      : 0;

  const rows: CommissionRow[] = staff.map((s) => {
    const b = byStaff.get(s.id)!;
    const servicePercent = Number(
      s.commissionRule?.servicePercent ?? DEFAULT_SERVICE_PCT,
    );
    const subscriptionPercent = Number(
      s.commissionRule?.subscriptionPercent ?? DEFAULT_SUB_PCT,
    );
    const productPercent = Number(
      s.commissionRule?.productPercent ?? DEFAULT_PRODUCT_PCT,
    );

    const potShare = subShareBase.some((x) => x.id === s.id) ? potPerStaff : 0;
    const subscriptionGross = b.subscriptionGross + potShare;

    const avulsoNet = (b.avulsoGross * servicePercent) / 100;
    const subscriptionNet = (subscriptionGross * subscriptionPercent) / 100;
    const productsNet = (b.productsGross * productPercent) / 100;
    const totalGross =
      b.avulsoGross + subscriptionGross + b.productsGross + b.bonus;
    const totalNet =
      avulsoNet + subscriptionNet + productsNet + b.bonus - b.advances;

    return {
      staffMemberId: s.id,
      professionalName: s.displayName?.trim() || s.email,
      avulsoGross: round2(b.avulsoGross),
      avulsoNet: round2(avulsoNet),
      subscriptionGross: round2(subscriptionGross),
      subscriptionNet: round2(subscriptionNet),
      productsGross: round2(b.productsGross),
      productsNet: round2(productsNet),
      bonus: round2(b.bonus),
      advances: round2(b.advances),
      totalGross: round2(totalGross),
      totalNet: round2(totalNet),
      servicePercent,
      subscriptionPercent,
      productPercent,
    };
  });

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    subscriptionRevenue: round2(subscriptionRevenue),
    potPercent,
    potAmount: round2(potAmount),
    rows,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Gera despesas em aberto (contas a pagar) para comissões selecionadas. */
export async function generateCommissionPayables(options: {
  organizationId: string;
  createdById: string;
  from: Date;
  to: Date;
  potPercent: number;
  staffMemberIds: string[];
  dueDate: Date;
  unitId?: string | null;
}): Promise<{ created: number }> {
  const snap = await getCommissionsSnapshot({
    organizationId: options.organizationId,
    from: options.from,
    to: options.to,
    potPercent: options.potPercent,
    unitId: options.unitId ?? undefined,
  });

  const selected = new Set(options.staffMemberIds);
  const rows = snap.rows.filter(
    (r) => selected.has(r.staffMemberId) && r.totalNet > 0,
  );

  let category = await prisma.financeCategory.findFirst({
    where: {
      organizationId: options.organizationId,
      kind: "EXPENSE",
      name: "Salários e comissões",
      parentId: null,
    },
  });
  if (!category) {
    category = await prisma.financeCategory.create({
      data: {
        organizationId: options.organizationId,
        kind: "EXPENSE",
        name: "Salários e comissões",
      },
    });
  }

  const periodLabel = `${options.from.toISOString().slice(0, 10)} — ${options.to.toISOString().slice(0, 10)}`;

  await prisma.financeEntry.createMany({
    data: rows.map((r) => ({
      organizationId: options.organizationId,
      unitId: options.unitId ?? null,
      kind: "EXPENSE" as const,
      status: "OPEN" as const,
      description: `Comissão ${r.professionalName} (${periodLabel})`,
      amount: r.totalNet,
      discountPercent: 0,
      interestPercent: 0,
      netAmount: computeFinanceNetAmount(r.totalNet, 0, 0),
      categoryId: category!.id,
      paymentCondition: "CASH" as const,
      paymentMethod: "Transferência",
      dueDate: options.dueDate,
      repeatMonthly: false,
      staffMemberId: r.staffMemberId,
      createdById: options.createdById,
      notes: `Gerado automaticamente — pote ${snap.potPercent}%`,
    })),
  });

  return { created: rows.length };
}
