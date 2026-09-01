import "server-only";

import type { FinanceCategoryCostType, Prisma } from "@prisma/client";
import { endOfMonth, startOfMonth } from "date-fns";

import { ensureDefaultFinanceCategories } from "@/lib/admin-finance";
import { prisma } from "@/lib/prisma";
import { computeFixedCostPerHour } from "@/lib/service-costing";

export type FinanceSettingsDto = {
  proLaboreMonthly: number;
  productiveHoursPerMonth: number;
  defaultVariableExpensePercent: number;
  defaultProfitMarginPercent: number;
  monthlyFixedCostsOverride: number | null;
  autoSettleReceivablesOnDueDate: boolean;
  autoCreateProLaboreExpense: boolean;
  paymentMethodFeesJson: Record<string, number> | null;
};

export type FinanceCategoryWithCostType = {
  id: string;
  kind: "EXPENSE" | "INCOME";
  name: string;
  parentId: string | null;
  costType: FinanceCategoryCostType;
};

const defaultSettings: FinanceSettingsDto = {
  proLaboreMonthly: 0,
  productiveHoursPerMonth: 156,
  defaultVariableExpensePercent: 10,
  defaultProfitMarginPercent: 20,
  monthlyFixedCostsOverride: null,
  autoSettleReceivablesOnDueDate: false,
  autoCreateProLaboreExpense: false,
  paymentMethodFeesJson: null,
};

function serializeSettings(
  row: {
    proLaboreMonthly: { toString(): string };
    productiveHoursPerMonth: number;
    defaultVariableExpensePercent: { toString(): string };
    defaultProfitMarginPercent: { toString(): string };
    monthlyFixedCostsOverride: { toString(): string } | null;
    autoSettleReceivablesOnDueDate: boolean;
    autoCreateProLaboreExpense: boolean;
    paymentMethodFeesJson: Prisma.JsonValue;
  } | null,
): FinanceSettingsDto {
  if (!row) return { ...defaultSettings };
  const fees = row.paymentMethodFeesJson;
  return {
    proLaboreMonthly: Number(row.proLaboreMonthly),
    productiveHoursPerMonth: row.productiveHoursPerMonth,
    defaultVariableExpensePercent: Number(row.defaultVariableExpensePercent),
    defaultProfitMarginPercent: Number(row.defaultProfitMarginPercent),
    monthlyFixedCostsOverride:
      row.monthlyFixedCostsOverride != null
        ? Number(row.monthlyFixedCostsOverride)
        : null,
    autoSettleReceivablesOnDueDate: row.autoSettleReceivablesOnDueDate,
    autoCreateProLaboreExpense: row.autoCreateProLaboreExpense,
    paymentMethodFeesJson:
      fees && typeof fees === "object" && !Array.isArray(fees)
        ? (fees as Record<string, number>)
        : null,
  };
}

export async function getOrCreateFinanceSettings(
  organizationId: string,
): Promise<FinanceSettingsDto> {
  const row = await prisma.financeSettings.upsert({
    where: { organizationId },
    create: { organizationId },
    update: {},
  });
  return serializeSettings(row);
}

export async function updateFinanceSettings(
  organizationId: string,
  input: Partial<FinanceSettingsDto>,
): Promise<FinanceSettingsDto> {
  const row = await prisma.financeSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      proLaboreMonthly: input.proLaboreMonthly ?? 0,
      productiveHoursPerMonth: input.productiveHoursPerMonth ?? 156,
      defaultVariableExpensePercent:
        input.defaultVariableExpensePercent ?? 10,
      defaultProfitMarginPercent: input.defaultProfitMarginPercent ?? 20,
      monthlyFixedCostsOverride: input.monthlyFixedCostsOverride ?? null,
      autoSettleReceivablesOnDueDate:
        input.autoSettleReceivablesOnDueDate ?? false,
      autoCreateProLaboreExpense: input.autoCreateProLaboreExpense ?? false,
      paymentMethodFeesJson: input.paymentMethodFeesJson ?? undefined,
    },
    update: {
      ...(input.proLaboreMonthly != null
        ? { proLaboreMonthly: input.proLaboreMonthly }
        : {}),
      ...(input.productiveHoursPerMonth != null
        ? { productiveHoursPerMonth: input.productiveHoursPerMonth }
        : {}),
      ...(input.defaultVariableExpensePercent != null
        ? { defaultVariableExpensePercent: input.defaultVariableExpensePercent }
        : {}),
      ...(input.defaultProfitMarginPercent != null
        ? { defaultProfitMarginPercent: input.defaultProfitMarginPercent }
        : {}),
      ...(input.monthlyFixedCostsOverride !== undefined
        ? { monthlyFixedCostsOverride: input.monthlyFixedCostsOverride }
        : {}),
      ...(input.autoSettleReceivablesOnDueDate != null
        ? { autoSettleReceivablesOnDueDate: input.autoSettleReceivablesOnDueDate }
        : {}),
      ...(input.autoCreateProLaboreExpense != null
        ? { autoCreateProLaboreExpense: input.autoCreateProLaboreExpense }
        : {}),
      ...(input.paymentMethodFeesJson !== undefined
        ? { paymentMethodFeesJson: input.paymentMethodFeesJson ?? undefined }
        : {}),
    },
  });
  return serializeSettings(row);
}

export async function listFinanceCategoriesWithCostType(
  organizationId: string,
): Promise<FinanceCategoryWithCostType[]> {
  const rows = await prisma.financeCategory.findMany({
    where: { organizationId, isActive: true },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    select: {
      id: true,
      kind: true,
      name: true,
      parentId: true,
      costType: true,
    },
  });
  return rows;
}

export async function updateFinanceCategoryCostType(
  organizationId: string,
  categoryId: string,
  costType: FinanceCategoryCostType,
): Promise<void> {
  await prisma.financeCategory.updateMany({
    where: { id: categoryId, organizationId },
    data: { costType },
  });
}

/** Soma despesas fixas do mês (categorias FIXED + override opcional). */
export async function getMonthlyFixedCosts(
  organizationId: string,
  referenceDate: Date = new Date(),
): Promise<number> {
  const settings = await getOrCreateFinanceSettings(organizationId);
  if (settings.monthlyFixedCostsOverride != null) {
    return settings.monthlyFixedCostsOverride;
  }

  const from = startOfMonth(referenceDate);
  const to = endOfMonth(referenceDate);

  const entries = await prisma.financeEntry.findMany({
    where: {
      organizationId,
      kind: "EXPENSE",
      status: { in: ["OPEN", "PAID"] },
      dueDate: { gte: from, lte: to },
      category: { costType: "FIXED" },
    },
    select: { netAmount: true, repeatMonthly: true },
  });

  let total = 0;
  for (const e of entries) {
    total += Number(e.netAmount);
  }

  if (total === 0) {
    const fallback = await prisma.financeEntry.findMany({
      where: {
        organizationId,
        kind: "EXPENSE",
        status: { in: ["OPEN", "PAID"] },
        dueDate: { gte: from, lte: to },
        OR: [
          { category: { costType: "NONE" } },
          { categoryId: null },
        ],
      },
      select: { netAmount: true },
    });
    for (const e of fallback) {
      total += Number(e.netAmount);
    }
  }

  return Math.round(total * 100) / 100;
}

export async function getFixedCostContext(
  organizationId: string,
  referenceDate: Date = new Date(),
): Promise<{
  settings: FinanceSettingsDto;
  monthlyFixedCosts: number;
  fixedCostPerHour: number;
  totalFixedWithProLabore: number;
}> {
  const settings = await getOrCreateFinanceSettings(organizationId);
  const monthlyFixedCosts = await getMonthlyFixedCosts(
    organizationId,
    referenceDate,
  );
  const totalFixedWithProLabore =
    monthlyFixedCosts + settings.proLaboreMonthly;
  const fixedCostPerHour = computeFixedCostPerHour(
    totalFixedWithProLabore,
    settings.productiveHoursPerMonth,
  );
  return {
    settings,
    monthlyFixedCosts,
    fixedCostPerHour,
    totalFixedWithProLabore,
  };
}

export async function listBankAccounts(organizationId: string) {
  return prisma.bankAccount.findMany({
    where: { organizationId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, isActive: true },
  });
}

export async function createBankAccount(
  organizationId: string,
  name: string,
) {
  return prisma.bankAccount.create({
    data: { organizationId, name: name.trim() },
    select: { id: true, name: true, isActive: true },
  });
}

const PRO_LABORE_CATEGORY = "Pró-labore";
const PRO_LABORE_DESC = "Pró-labore mensal";

async function getOrCreateProLaboreCategory(organizationId: string) {
  await ensureDefaultFinanceCategories(organizationId);
  const existing = await prisma.financeCategory.findFirst({
    where: {
      organizationId,
      kind: "EXPENSE",
      name: PRO_LABORE_CATEGORY,
    },
  });
  if (existing) {
    if (existing.costType !== "FIXED") {
      await prisma.financeCategory.update({
        where: { id: existing.id },
        data: { costType: "FIXED" },
      });
    }
    return existing.id;
  }
  const created = await prisma.financeCategory.create({
    data: {
      organizationId,
      kind: "EXPENSE",
      name: PRO_LABORE_CATEGORY,
      costType: "FIXED",
    },
  });
  return created.id;
}

/** Cria lançamento de pró-labore no mês se configurado e ainda não existir. */
export async function ensureProLaboreMonthlyEntry(
  organizationId: string,
  referenceDate: Date = new Date(),
): Promise<boolean> {
  const settings = await getOrCreateFinanceSettings(organizationId);
  if (!settings.autoCreateProLaboreExpense || settings.proLaboreMonthly <= 0) {
    return false;
  }

  const from = startOfMonth(referenceDate);
  const to = endOfMonth(referenceDate);

  const existing = await prisma.financeEntry.findFirst({
    where: {
      organizationId,
      kind: "EXPENSE",
      description: PRO_LABORE_DESC,
      dueDate: { gte: from, lte: to },
      status: { not: "CANCELLED" },
    },
    select: { id: true },
  });
  if (existing) return false;

  const categoryId = await getOrCreateProLaboreCategory(organizationId);
  const amount = settings.proLaboreMonthly;

  await prisma.financeEntry.create({
    data: {
      organizationId,
      kind: "EXPENSE",
      status: "OPEN",
      description: PRO_LABORE_DESC,
      amount,
      netAmount: amount,
      categoryId,
      dueDate: to,
      repeatMonthly: true,
      notes: "Gerado automaticamente pela configuração financeira.",
    },
  });
  return true;
}
