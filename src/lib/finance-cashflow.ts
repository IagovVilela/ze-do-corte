import "server-only";

import {
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
} from "date-fns";

import { prisma } from "@/lib/prisma";
import { ensureProLaboreMonthlyEntry } from "@/lib/finance-settings";
import { roundMoney } from "@/lib/service-costing";

export type CashFlowBucket = {
  date: string;
  label: string;
  inflow: number;
  outflow: number;
  net: number;
  runningBalance: number;
  isProjected: boolean;
};

export type CashFlowSnapshot = {
  from: string;
  to: string;
  openingBalance: number;
  closingBalance: number;
  totalInflow: number;
  totalOutflow: number;
  buckets: CashFlowBucket[];
  byCategory: {
    categoryId: string | null;
    categoryName: string;
    costType: string;
    inflow: number;
    outflow: number;
  }[];
};

type Movement = {
  date: Date;
  inflow: number;
  outflow: number;
  isProjected: boolean;
  categoryId: string | null;
  categoryName: string;
  costType: string;
};

function appointmentAmount(a: {
  amountPaid: { toString(): string } | number | null;
  service: { price: { toString(): string } | number };
  items: { price: { toString(): string } | number }[];
  products: { quantity: number; unitPrice: { toString(): string } | number }[];
}): number {
  const servicePart =
    a.amountPaid != null
      ? Number(a.amountPaid)
      : Number(a.service.price) +
        a.items.reduce((s, i) => s + Number(i.price), 0);
  const productsPart = a.products.reduce(
    (s, p) => s + Number(p.unitPrice) * p.quantity,
    0,
  );
  return servicePart + productsPart;
}

export async function buildCashFlowSnapshot(options: {
  organizationId: string;
  from: Date;
  to: Date;
  unitId?: string;
  openingBalance?: number;
}): Promise<CashFlowSnapshot> {
  const from = startOfDay(options.from);
  const to = endOfDay(options.to);
  const openingBalance = options.openingBalance ?? 0;

  await ensureProLaboreMonthlyEntry(options.organizationId, from);

  const movements: Movement[] = [];

  const entries = await prisma.financeEntry.findMany({
    where: {
      organizationId: options.organizationId,
      status: { in: ["OPEN", "PAID"] },
      dueDate: { gte: from, lte: to },
      ...(options.unitId ? { unitId: options.unitId } : {}),
    },
    include: {
      category: { select: { id: true, name: true, costType: true } },
    },
  });

  for (const e of entries) {
    const amount = Number(e.netAmount);
    const isProjected = e.status === "OPEN";
    const cashDate = e.status === "PAID" && e.paidAt ? e.paidAt : e.dueDate;
    if (e.kind === "INCOME") {
      movements.push({
        date: cashDate,
        inflow: amount,
        outflow: 0,
        isProjected,
        categoryId: e.categoryId,
        categoryName: e.category?.name ?? "Sem categoria",
        costType: e.category?.costType ?? "NONE",
      });
    } else {
      movements.push({
        date: cashDate,
        inflow: 0,
        outflow: amount,
        isProjected,
        categoryId: e.categoryId,
        categoryName: e.category?.name ?? "Sem categoria",
        costType: e.category?.costType ?? "NONE",
      });
    }
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      unit: { organizationId: options.organizationId },
      ...(options.unitId ? { unitId: options.unitId } : {}),
      paidAt: { gte: from, lte: to },
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    include: {
      service: { select: { price: true } },
      items: { select: { price: true } },
      products: { select: { quantity: true, unitPrice: true } },
    },
  });

  for (const a of appointments) {
    if (!a.paidAt) continue;
    movements.push({
      date: a.paidAt,
      inflow: appointmentAmount(a),
      outflow: 0,
      isProjected: false,
      categoryId: null,
      categoryName: "Atendimentos",
      costType: "NONE",
    });
  }

  const recurring = await prisma.financeEntry.findMany({
    where: {
      organizationId: options.organizationId,
      repeatMonthly: true,
      status: { in: ["OPEN", "PAID"] },
    },
    include: {
      category: { select: { id: true, name: true, costType: true } },
    },
  });

  let cursor = startOfMonth(from);
  while (cursor <= to) {
    for (const e of recurring) {
      const day = e.dueDate.getDate();
      const projected = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      if (projected < from || projected > to) continue;
      if (projected < new Date()) continue;
      const amount = Number(e.netAmount);
      movements.push({
        date: projected,
        inflow: e.kind === "INCOME" ? amount : 0,
        outflow: e.kind === "EXPENSE" ? amount : 0,
        isProjected: true,
        categoryId: e.categoryId,
        categoryName: `${e.category?.name ?? "Recorrente"} (proj.)`,
        costType: e.category?.costType ?? "NONE",
      });
    }
    cursor = addMonths(cursor, 1);
  }

  const days = eachDayOfInterval({ start: from, end: to });
  let running = openingBalance;
  let totalInflow = 0;
  let totalOutflow = 0;

  const buckets: CashFlowBucket[] = days.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const dayMoves = movements.filter(
      (m) => m.date >= dayStart && m.date <= dayEnd,
    );
    const inflow = roundMoney(dayMoves.reduce((s, m) => s + m.inflow, 0));
    const outflow = roundMoney(dayMoves.reduce((s, m) => s + m.outflow, 0));
    const net = roundMoney(inflow - outflow);
    totalInflow += inflow;
    totalOutflow += outflow;
    running = roundMoney(running + net);
    const isProjected = dayMoves.some((m) => m.isProjected) && day > new Date();
    return {
      date: day.toISOString(),
      label: format(day, "dd/MM"),
      inflow,
      outflow,
      net,
      runningBalance: running,
      isProjected,
    };
  });

  const categoryMap = new Map<
    string,
    {
      categoryId: string | null;
      categoryName: string;
      costType: string;
      inflow: number;
      outflow: number;
    }
  >();

  for (const m of movements) {
    const key = m.categoryId ?? `__${m.categoryName}`;
    const existing = categoryMap.get(key) ?? {
      categoryId: m.categoryId,
      categoryName: m.categoryName,
      costType: m.costType,
      inflow: 0,
      outflow: 0,
    };
    existing.inflow += m.inflow;
    existing.outflow += m.outflow;
    categoryMap.set(key, existing);
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    openingBalance,
    closingBalance: running,
    totalInflow: roundMoney(totalInflow),
    totalOutflow: roundMoney(totalOutflow),
    buckets,
    byCategory: Array.from(categoryMap.values()).map((c) => ({
      ...c,
      inflow: roundMoney(c.inflow),
      outflow: roundMoney(c.outflow),
    })),
  };
}

export async function autoSettleDueReceivables(
  organizationId: string,
  now = new Date(),
): Promise<number> {
  const settings = await prisma.financeSettings.findUnique({
    where: { organizationId },
    select: { autoSettleReceivablesOnDueDate: true },
  });
  if (!settings?.autoSettleReceivablesOnDueDate) return 0;

  const end = endOfDay(now);
  const result = await prisma.financeEntry.updateMany({
    where: {
      organizationId,
      kind: "INCOME",
      status: "OPEN",
      dueDate: { lte: end },
    },
    data: {
      status: "PAID",
      paidAt: now,
    },
  });
  return result.count;
}

export async function getProjectedBalanceNegative(
  organizationId: string,
  daysAhead = 30,
): Promise<boolean> {
  const from = startOfDay(new Date());
  const to = endOfDay(addMonths(from, 0));
  to.setDate(to.getDate() + daysAhead);
  const snap = await buildCashFlowSnapshot({
    organizationId,
    from,
    to,
  });
  return snap.buckets.some((b) => b.isProjected && b.runningBalance < 0);
}
