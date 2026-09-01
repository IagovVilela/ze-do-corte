import "server-only";

import { endOfMonth, startOfMonth, subMonths } from "date-fns";

import { getCommissionsSnapshot } from "@/lib/admin-commissions";
import { ensureProLaboreMonthlyEntry, getFixedCostContext, getMonthlyFixedCosts } from "@/lib/finance-settings";
import { prisma } from "@/lib/prisma";
import { listServiceCostRows } from "@/lib/service-costing-admin";
import { roundMoney } from "@/lib/service-costing";

export type DreLine = {
  key: string;
  label: string;
  amount: number;
  level: number;
  isTotal?: boolean;
};

export type DreSnapshot = {
  yearMonth: string;
  from: string;
  to: string;
  lines: DreLine[];
  previousMonth: {
    yearMonth: string;
    netResult: number;
  } | null;
};

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function appointmentRevenue(a: {
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

export async function buildDreSnapshot(options: {
  organizationId: string;
  yearMonth: string;
  unitId?: string;
}): Promise<DreSnapshot> {
  const [y, m] = options.yearMonth.split("-").map(Number);
  const ref = new Date(y, m - 1, 1);
  const from = startOfMonth(ref);
  const to = endOfMonth(ref);

  await ensureProLaboreMonthlyEntry(options.organizationId, ref);

  const settingsCtx = await getFixedCostContext(options.organizationId, ref);
  const variablePct = settingsCtx.settings.defaultVariableExpensePercent;

  const appointments = await prisma.appointment.findMany({
    where: {
      unit: { organizationId: options.organizationId },
      ...(options.unitId ? { unitId: options.unitId } : {}),
      paidAt: { gte: from, lte: to },
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    include: {
      service: { select: { price: true, id: true } },
      items: { select: { price: true } },
      products: {
        select: {
          quantity: true,
          unitPrice: true,
          product: { select: { costPrice: true } },
        },
      },
    },
  });

  let grossRevenue = 0;
  let productCost = 0;
  for (const a of appointments) {
    grossRevenue += appointmentRevenue(a);
    for (const p of a.products) {
      const cost = p.product.costPrice;
      if (cost != null) {
        productCost += Number(cost) * p.quantity;
      }
    }
  }

  const manualIncome = await prisma.financeEntry.aggregate({
    where: {
      organizationId: options.organizationId,
      kind: "INCOME",
      status: "PAID",
      dueDate: { gte: from, lte: to },
      ...(options.unitId ? { unitId: options.unitId } : {}),
    },
    _sum: { netAmount: true },
  });
  grossRevenue += Number(manualIncome._sum.netAmount ?? 0);

  const subscriptions = await prisma.clientSubscription.findMany({
    where: {
      organizationId: options.organizationId,
      status: { in: ["ACTIVE", "PAST_DUE"] },
    },
    include: { plan: { select: { price: true } } },
  });
  const clubRevenue = subscriptions.reduce(
    (s, sub) => s + Number(sub.plan.price),
    0,
  );
  grossRevenue += clubRevenue;

  const deductions = roundMoney(grossRevenue * (variablePct / 100));
  const netRevenue = roundMoney(grossRevenue - deductions);

  const costRows = await listServiceCostRows(options.organizationId, {
    unitId: options.unitId,
    variablePercent: variablePct,
    profitPercent: settingsCtx.settings.defaultProfitMarginPercent,
  });
  const costByService = new Map(
    costRows.rows.map((r) => [r.serviceId, r.cost.csvTotal]),
  );
  let serviceCsvTotal = 0;
  for (const a of appointments) {
    const csv = costByService.get(a.service.id) ?? 0;
    serviceCsvTotal += csv;
  }
  serviceCsvTotal = roundMoney(serviceCsvTotal + productCost);

  const variableExpenses = await prisma.financeEntry.aggregate({
    where: {
      organizationId: options.organizationId,
      kind: "EXPENSE",
      status: { in: ["OPEN", "PAID"] },
      dueDate: { gte: from, lte: to },
      category: { costType: "VARIABLE" },
      ...(options.unitId ? { unitId: options.unitId } : {}),
    },
    _sum: { netAmount: true },
  });
  const variableExpensesAmount = Number(variableExpenses._sum.netAmount ?? 0);

  const contributionMargin = roundMoney(
    netRevenue - serviceCsvTotal - variableExpensesAmount,
  );

  const fixedExpenses = await getMonthlyFixedCosts(
    options.organizationId,
    ref,
  );
  const proLabore = settingsCtx.settings.proLaboreMonthly;

  const commissions = await getCommissionsSnapshot({
    organizationId: options.organizationId,
    from,
    to,
    unitId: options.unitId,
  });
  const commissionsTotal = commissions.rows.reduce(
    (s, r) => s + r.totalNet,
    0,
  );

  const operatingResult = roundMoney(
    contributionMargin - fixedExpenses - proLabore - commissionsTotal,
  );
  const netResult = operatingResult;

  const lines: DreLine[] = [
    { key: "gross", label: "Receita bruta", amount: grossRevenue, level: 0 },
    {
      key: "deductions",
      label: `(−) Deduções / despesas variáveis (${variablePct}%)`,
      amount: -deductions,
      level: 1,
    },
    {
      key: "net_revenue",
      label: "Receita líquida",
      amount: netRevenue,
      level: 0,
      isTotal: true,
    },
    {
      key: "csv",
      label: "(−) CSV / custos diretos",
      amount: -serviceCsvTotal,
      level: 1,
    },
    {
      key: "var_exp",
      label: "(−) Despesas variáveis (lançamentos)",
      amount: -variableExpensesAmount,
      level: 1,
    },
    {
      key: "contribution",
      label: "Margem de contribuição",
      amount: contributionMargin,
      level: 0,
      isTotal: true,
    },
    {
      key: "fixed",
      label: "(−) Despesas fixas",
      amount: -fixedExpenses,
      level: 1,
    },
    {
      key: "pro_labore",
      label: "(−) Pró-labore",
      amount: -proLabore,
      level: 1,
    },
    {
      key: "commissions",
      label: "(−) Comissões",
      amount: -commissionsTotal,
      level: 1,
    },
    {
      key: "operating",
      label: "Resultado operacional",
      amount: operatingResult,
      level: 0,
      isTotal: true,
    },
    {
      key: "net",
      label: "Resultado líquido",
      amount: netResult,
      level: 0,
      isTotal: true,
    },
  ];

  const prevRef = subMonths(ref, 1);
  const prevSnapshot = await buildDreSnapshotInner({
    organizationId: options.organizationId,
    from: startOfMonth(prevRef),
    to: endOfMonth(prevRef),
    unitId: options.unitId,
    settingsCtx: await getFixedCostContext(options.organizationId, prevRef),
    variablePct,
    costRows: await listServiceCostRows(options.organizationId, {
      unitId: options.unitId,
    }),
  });

  return {
    yearMonth: ym(ref),
    from: from.toISOString(),
    to: to.toISOString(),
    lines,
    previousMonth: {
      yearMonth: ym(prevRef),
      netResult: prevSnapshot.netResult,
    },
  };
}

async function buildDreSnapshotInner(options: {
  organizationId: string;
  from: Date;
  to: Date;
  unitId?: string;
  settingsCtx: Awaited<ReturnType<typeof getFixedCostContext>>;
  variablePct: number;
  costRows: Awaited<ReturnType<typeof listServiceCostRows>>;
}): Promise<{ netResult: number }> {
  const appointments = await prisma.appointment.findMany({
    where: {
      unit: { organizationId: options.organizationId },
      ...(options.unitId ? { unitId: options.unitId } : {}),
      paidAt: { gte: options.from, lte: options.to },
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    include: {
      service: { select: { id: true, price: true } },
      items: { select: { price: true } },
      products: { select: { quantity: true, unitPrice: true } },
    },
  });

  let gross = 0;
  for (const a of appointments) gross += appointmentRevenue(a);

  const costByService = new Map(
    options.costRows.rows.map((r) => [r.serviceId, r.cost.csvTotal]),
  );
  let csv = 0;
  for (const a of appointments) {
    csv += costByService.get(a.service.id) ?? 0;
  }

  const deductions = gross * (options.variablePct / 100);
  const netRev = gross - deductions;
  const contribution = netRev - csv;
  const fixed = await getMonthlyFixedCosts(
    options.organizationId,
    options.from,
  );
  const proLabore = options.settingsCtx.settings.proLaboreMonthly;
  const commissions = await getCommissionsSnapshot({
    organizationId: options.organizationId,
    from: options.from,
    to: options.to,
    unitId: options.unitId,
  });
  const commTotal = commissions.rows.reduce((s, r) => s + r.totalNet, 0);
  return {
    netResult: roundMoney(
      contribution - fixed - proLabore - commTotal,
    ),
  };
}
