import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { getPostHogClient } from "@/lib/posthog-server";
import {
  createFinanceEntry,
  listFinanceCategories,
  listFinanceEntries,
  serializeFinanceEntry,
} from "@/lib/admin-finance";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function forbidIfNoRevenue(
  access: { permissions: { viewRevenue: boolean } },
) {
  if (!access.permissions.viewRevenue) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  const denied = forbidIfNoRevenue(auth.access);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (searchParams.get("categories") === "1") {
    const categories = await listFinanceCategories(
      auth.access.organizationId,
      kind === "EXPENSE" || kind === "INCOME" ? kind : undefined,
    );
    return NextResponse.json({ categories });
  }

  const unitIdParam = searchParams.get("unitId");
  let unitId: string | undefined =
    unitIdParam && unitIdParam.length > 0 ? unitIdParam : undefined;

  if (unitId) {
    const unitOk = await prisma.barbershopUnit.findFirst({
      where: { id: unitId, organizationId: auth.access.organizationId },
      select: { id: true },
    });
    if (!unitOk) {
      return NextResponse.json({ message: "Filial inválida." }, { status: 400 });
    }
  }

  const entries = await listFinanceEntries({
    organizationId: auth.access.organizationId,
    kind: kind === "EXPENSE" || kind === "INCOME" ? kind : undefined,
    status:
      status === "OPEN" || status === "PAID" || status === "CANCELLED"
        ? status
        : status === "payable"
          ? "OPEN"
          : undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    unitId,
  });

  return NextResponse.json({
    entries: entries.map(serializeFinanceEntry),
  });
}

const createSchema = z.object({
  kind: z.enum(["EXPENSE", "INCOME"]),
  description: z.string().trim().min(2).max(200),
  amount: z.number().finite().positive(),
  discountPercent: z.number().finite().min(0).max(100).optional(),
  interestPercent: z.number().finite().min(0).max(100).optional(),
  categoryId: z.string().min(1).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  paymentCondition: z.enum(["CASH", "INSTALLMENT"]).optional(),
  paymentMethod: z.string().trim().max(80).nullable().optional(),
  bankAccount: z.string().trim().max(120).nullable().optional(),
  dueDate: z.string().min(8),
  unitId: z.string().min(1).nullable().optional(),
  repeatMonthly: z.boolean().optional(),
  status: z.enum(["OPEN", "PAID", "CANCELLED"]).optional(),
});

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  const denied = forbidIfNoRevenue(auth.access);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const dueDate = new Date(parsed.data.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ message: "Data inválida." }, { status: 400 });
  }

  if (parsed.data.unitId) {
    const unit = await prisma.barbershopUnit.findFirst({
      where: {
        id: parsed.data.unitId,
        organizationId: auth.access.organizationId,
      },
      select: { id: true },
    });
    if (!unit) {
      return NextResponse.json({ message: "Filial inválida." }, { status: 400 });
    }
  }

  if (parsed.data.categoryId) {
    const cat = await prisma.financeCategory.findFirst({
      where: {
        id: parsed.data.categoryId,
        organizationId: auth.access.organizationId,
        kind: parsed.data.kind,
      },
      select: { id: true },
    });
    if (!cat) {
      return NextResponse.json(
        { message: "Categoria inválida." },
        { status: 400 },
      );
    }
  }

  const entry = await createFinanceEntry(auth.access, {
    ...parsed.data,
    dueDate,
  });

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: auth.access.userId,
    event: "finance_entry_created",
    properties: {
      organization_id: auth.access.organizationId,
      entry_kind: parsed.data.kind,
      amount: parsed.data.amount,
      payment_condition: parsed.data.paymentCondition ?? null,
      repeat_monthly: parsed.data.repeatMonthly ?? false,
    },
  });
  await posthog.flush();

  return NextResponse.json(
    { entry: serializeFinanceEntry(entry) },
    { status: 201 },
  );
}
