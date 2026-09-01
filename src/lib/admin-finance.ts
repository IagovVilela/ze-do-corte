import "server-only";

import type {
  FinanceEntryKind,
  FinanceEntryStatus,
  FinancePaymentCondition,
  Prisma,
} from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";

import type { StaffAccess } from "@/lib/staff-access";
import { prisma } from "@/lib/prisma";

export function computeFinanceNetAmount(
  amount: number,
  discountPercent: number,
  interestPercent: number,
): number {
  const d = Math.min(100, Math.max(0, discountPercent));
  const i = Math.max(0, interestPercent);
  const afterDiscount = amount * (1 - d / 100);
  return Math.round(afterDiscount * (1 + i / 100) * 100) / 100;
}

export type FinanceEntryInput = {
  kind: FinanceEntryKind;
  description: string;
  amount: number;
  discountPercent?: number;
  interestPercent?: number;
  categoryId?: string | null;
  notes?: string | null;
  paymentCondition?: FinancePaymentCondition;
  paymentMethod?: string | null;
  bankAccount?: string | null;
  dueDate: Date;
  unitId?: string | null;
  repeatMonthly?: boolean;
  status?: FinanceEntryStatus;
  paidAt?: Date | null;
  staffMemberId?: string | null;
};

const DEFAULT_CATEGORIES: { kind: FinanceEntryKind; name: string }[] = [
  { kind: "EXPENSE", name: "Aluguel" },
  { kind: "EXPENSE", name: "Fornecedores" },
  { kind: "EXPENSE", name: "Salários e comissões" },
  { kind: "EXPENSE", name: "Utilidades" },
  { kind: "EXPENSE", name: "Marketing" },
  { kind: "EXPENSE", name: "Outros" },
  { kind: "INCOME", name: "Serviços" },
  { kind: "INCOME", name: "Produtos" },
  { kind: "INCOME", name: "Clube" },
  { kind: "INCOME", name: "Outros" },
];

export async function ensureDefaultFinanceCategories(
  organizationId: string,
): Promise<void> {
  const count = await prisma.financeCategory.count({
    where: { organizationId, parentId: null },
  });
  if (count > 0) return;

  await prisma.financeCategory.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({
      organizationId,
      kind: c.kind,
      name: c.name,
    })),
    skipDuplicates: true,
  });
}

export async function listFinanceCategories(
  organizationId: string,
  kind?: FinanceEntryKind,
) {
  await ensureDefaultFinanceCategories(organizationId);
  return prisma.financeCategory.findMany({
    where: {
      organizationId,
      isActive: true,
      ...(kind ? { kind } : {}),
    },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    select: {
      id: true,
      kind: true,
      name: true,
      parentId: true,
      costType: true,
    },
  });
}

export function serializeFinanceEntry(
  entry: {
    id: string;
    kind: FinanceEntryKind;
    status: FinanceEntryStatus;
    description: string;
    amount: { toString(): string } | number;
    discountPercent: { toString(): string } | number;
    interestPercent: { toString(): string } | number;
    netAmount: { toString(): string } | number;
    categoryId: string | null;
    notes: string | null;
    paymentCondition: FinancePaymentCondition;
    paymentMethod: string | null;
    bankAccount: string | null;
    dueDate: Date;
    paidAt: Date | null;
    repeatMonthly: boolean;
    unitId: string | null;
    staffMemberId: string | null;
    createdAt: Date;
    category?: { id: string; name: string } | null;
    unit?: { id: string; name: string } | null;
  },
) {
  return {
    id: entry.id,
    kind: entry.kind,
    status: entry.status,
    description: entry.description,
    amount: Number(entry.amount),
    discountPercent: Number(entry.discountPercent),
    interestPercent: Number(entry.interestPercent),
    netAmount: Number(entry.netAmount),
    categoryId: entry.categoryId,
    categoryName: entry.category?.name ?? null,
    notes: entry.notes,
    paymentCondition: entry.paymentCondition,
    paymentMethod: entry.paymentMethod,
    bankAccount: entry.bankAccount,
    dueDate: entry.dueDate.toISOString(),
    paidAt: entry.paidAt?.toISOString() ?? null,
    repeatMonthly: entry.repeatMonthly,
    unitId: entry.unitId,
    unitName: entry.unit?.name ?? null,
    staffMemberId: entry.staffMemberId,
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function createFinanceEntry(
  access: StaffAccess,
  input: FinanceEntryInput,
) {
  const discountPercent = input.discountPercent ?? 0;
  const interestPercent = input.interestPercent ?? 0;
  const netAmount = computeFinanceNetAmount(
    input.amount,
    discountPercent,
    interestPercent,
  );

  const status =
    input.status ?? (input.paymentCondition === "CASH" ? "PAID" : "OPEN");

  const paidAt = input.paidAt ?? (status === "PAID" ? input.dueDate : null);

  return prisma.financeEntry.create({
    data: {
      organizationId: access.organizationId,
      unitId: input.unitId ?? null,
      kind: input.kind,
      status,
      description: input.description.trim(),
      amount: input.amount,
      discountPercent,
      interestPercent,
      netAmount,
      categoryId: input.categoryId ?? null,
      notes: input.notes?.trim() || null,
      paymentCondition: input.paymentCondition ?? "CASH",
      paymentMethod: input.paymentMethod?.trim() || null,
      bankAccount: input.bankAccount?.trim() || null,
      dueDate: input.dueDate,
      paidAt,
      repeatMonthly: input.repeatMonthly ?? false,
      staffMemberId: input.staffMemberId ?? null,
      createdById: access.userId,
    },
    include: {
      category: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true } },
    },
  });
}

export async function listFinanceEntries(options: {
  organizationId: string;
  kind?: FinanceEntryKind;
  status?: FinanceEntryStatus | FinanceEntryStatus[];
  from?: Date;
  to?: Date;
  unitId?: string;
  take?: number;
}) {
  const statusFilter = options.status
    ? Array.isArray(options.status)
      ? { in: options.status }
      : options.status
    : undefined;

  const where: Prisma.FinanceEntryWhereInput = {
    organizationId: options.organizationId,
    ...(options.kind ? { kind: options.kind } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(options.unitId ? { unitId: options.unitId } : {}),
    ...(options.from || options.to
      ? {
          dueDate: {
            ...(options.from ? { gte: startOfDay(options.from) } : {}),
            ...(options.to ? { lte: endOfDay(options.to) } : {}),
          },
        }
      : {}),
  };

  return prisma.financeEntry.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true } },
    },
    orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
    take: options.take ?? 200,
  });
}

export async function getFinanceBalanceSnapshot(options: {
  organizationId: string;
  from: Date;
  to: Date;
  unitId?: string;
}) {
  const from = startOfDay(options.from);
  const to = endOfDay(options.to);

  const entries = await prisma.financeEntry.findMany({
    where: {
      organizationId: options.organizationId,
      status: { in: ["OPEN", "PAID"] },
      ...(options.unitId ? { unitId: options.unitId } : {}),
      dueDate: { gte: from, lte: to },
    },
    select: {
      kind: true,
      status: true,
      netAmount: true,
    },
  });

  let incomePaid = 0;
  let incomeOpen = 0;
  let expensePaid = 0;
  let expenseOpen = 0;

  for (const e of entries) {
    const n = Number(e.netAmount);
    if (e.kind === "INCOME") {
      if (e.status === "PAID") incomePaid += n;
      else incomeOpen += n;
    } else if (e.status === "PAID") expensePaid += n;
    else expenseOpen += n;
  }

  const appointmentPaid = await prisma.appointment.findMany({
    where: {
      unit: { organizationId: options.organizationId },
      ...(options.unitId ? { unitId: options.unitId } : {}),
      paidAt: { gte: from, lte: to },
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    select: {
      amountPaid: true,
      service: { select: { price: true } },
      products: { select: { quantity: true, unitPrice: true } },
      items: { select: { price: true } },
    },
  });

  let caixaServices = 0;
  let caixaProducts = 0;
  for (const a of appointmentPaid) {
    const servicePart =
      a.amountPaid != null
        ? Number(a.amountPaid)
        : Number(a.service.price) +
          a.items.reduce((s, i) => s + Number(i.price), 0);
    caixaServices += servicePart;
    caixaProducts += a.products.reduce(
      (s, p) => s + Number(p.unitPrice) * p.quantity,
      0,
    );
  }

  const totalIncome = incomePaid + caixaServices + caixaProducts;
  const totalExpense = expensePaid;
  const projectedIncome = totalIncome + incomeOpen;
  const projectedExpense = totalExpense + expenseOpen;

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    manualIncomePaid: incomePaid,
    manualIncomeOpen: incomeOpen,
    manualExpensePaid: expensePaid,
    manualExpenseOpen: expenseOpen,
    caixaServices,
    caixaProducts,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    projectedBalance: projectedIncome - projectedExpense,
  };
}

export async function markFinanceEntryPaid(
  organizationId: string,
  entryId: string,
) {
  return prisma.financeEntry.updateMany({
    where: { id: entryId, organizationId, status: "OPEN" },
    data: { status: "PAID", paidAt: new Date() },
  });
}

export async function cancelFinanceEntry(
  organizationId: string,
  entryId: string,
) {
  return prisma.financeEntry.updateMany({
    where: { id: entryId, organizationId, status: { not: "CANCELLED" } },
    data: { status: "CANCELLED" },
  });
}
