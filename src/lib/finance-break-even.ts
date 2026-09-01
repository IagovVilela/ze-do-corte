import "server-only";

import { endOfMonth, startOfMonth } from "date-fns";

import { getFixedCostContext, getMonthlyFixedCosts } from "@/lib/finance-settings";
import { prisma } from "@/lib/prisma";
import { listServiceCostRows } from "@/lib/service-costing-admin";
import { roundMoney } from "@/lib/service-costing";

export type BreakEvenSnapshot = {
  yearMonth: string;
  fixedCostsTotal: number;
  proLabore: number;
  monthlyFixedCosts: number;
  averageTicket: number;
  averageContributionMargin: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  actualUnits: number;
  actualRevenue: number;
  progressPercent: number;
  productiveHoursPerMonth: number;
};

function appointmentGross(a: {
  amountPaid: { toString(): string } | number | null;
  service: { price: { toString(): string } | number; id: string };
  items: { price: { toString(): string } | number }[];
}): number {
  if (a.amountPaid != null) return Number(a.amountPaid);
  return (
    Number(a.service.price) +
    a.items.reduce((s, i) => s + Number(i.price), 0)
  );
}

export async function buildBreakEvenSnapshot(options: {
  organizationId: string;
  yearMonth: string;
  unitId?: string;
  priceAdjustPercent?: number;
  productiveHoursOverride?: number;
}): Promise<BreakEvenSnapshot> {
  const [y, m] = options.yearMonth.split("-").map(Number);
  const ref = new Date(y, m - 1, 1);
  const from = startOfMonth(ref);
  const to = endOfMonth(ref);

  const ctx = await getFixedCostContext(options.organizationId, ref);
  const settings = ctx.settings;
  const variablePct = settings.defaultVariableExpensePercent;
  const productiveHours =
    options.productiveHoursOverride ?? settings.productiveHoursPerMonth;

  const monthlyFixed = await getMonthlyFixedCosts(
    options.organizationId,
    ref,
  );
  const proLabore = settings.proLaboreMonthly;
  const fixedCostsTotal = monthlyFixed + proLabore;

  const costRows = await listServiceCostRows(options.organizationId, {
    unitId: options.unitId,
    variablePercent: variablePct,
    profitPercent: settings.defaultProfitMarginPercent,
  });
  const csvByService = new Map(
    costRows.rows.map((r) => [r.serviceId, r.cost.csvTotal]),
  );

  const appointments = await prisma.appointment.findMany({
    where: {
      unit: { organizationId: options.organizationId },
      ...(options.unitId ? { unitId: options.unitId } : {}),
      paidAt: { gte: from, lte: to },
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    include: {
      service: { select: { id: true, price: true } },
      items: { select: { price: true } },
    },
  });

  let actualRevenue = 0;
  let totalContribution = 0;
  const priceFactor = 1 + (options.priceAdjustPercent ?? 0) / 100;

  for (const a of appointments) {
    const gross = appointmentGross(a) * priceFactor;
    const csv = csvByService.get(a.service.id) ?? 0;
    const variable = gross * (variablePct / 100);
    actualRevenue += gross;
    totalContribution += gross - csv - variable;
  }

  const actualUnits = appointments.length;
  const averageTicket =
    actualUnits > 0 ? roundMoney(actualRevenue / actualUnits) : 0;
  const averageContributionMargin =
    actualUnits > 0 ? roundMoney(totalContribution / actualUnits) : 0;

  const estimatedContributionFromPricing =
    costRows.rows.length > 0
      ? roundMoney(
          costRows.rows.reduce((s, r) => {
            const gross = r.currentPrice * priceFactor;
            const variable = gross * (variablePct / 100);
            return s + (gross - r.cost.csvTotal - variable);
          }, 0) / costRows.rows.length,
        )
      : averageContributionMargin;

  const marginForPe =
    averageContributionMargin > 0
      ? averageContributionMargin
      : estimatedContributionFromPricing;

  const breakEvenUnits =
    marginForPe > 0
      ? Math.ceil(fixedCostsTotal / marginForPe)
      : 0;
  const breakEvenRevenue = roundMoney(breakEvenUnits * averageTicket);
  const progressPercent =
    breakEvenUnits > 0
      ? Math.min(100, roundMoney((actualUnits / breakEvenUnits) * 100))
      : actualUnits > 0
        ? 100
        : 0;

  return {
    yearMonth: options.yearMonth,
    fixedCostsTotal: roundMoney(fixedCostsTotal),
    proLabore,
    monthlyFixedCosts: monthlyFixed,
    averageTicket,
    averageContributionMargin: marginForPe,
    breakEvenUnits,
    breakEvenRevenue,
    actualUnits,
    actualRevenue: roundMoney(actualRevenue),
    progressPercent,
    productiveHoursPerMonth: productiveHours,
  };
}

export type BreakEvenSimulation = {
  priceAdjustPercent: number;
  productiveHours: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
};

export async function simulateBreakEven(options: {
  organizationId: string;
  yearMonth: string;
  priceAdjustPercent: number;
  productiveHours: number;
  unitId?: string;
}): Promise<BreakEvenSimulation> {
  const snap = await buildBreakEvenSnapshot({
    organizationId: options.organizationId,
    yearMonth: options.yearMonth,
    unitId: options.unitId,
    priceAdjustPercent: options.priceAdjustPercent,
    productiveHoursOverride: options.productiveHours,
  });
  return {
    priceAdjustPercent: options.priceAdjustPercent,
    productiveHours: options.productiveHours,
    breakEvenUnits: snap.breakEvenUnits,
    breakEvenRevenue: snap.breakEvenRevenue,
  };
}
