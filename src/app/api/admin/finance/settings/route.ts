import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  createBankAccount,
  getOrCreateFinanceSettings,
  listBankAccounts,
  listFinanceCategoriesWithCostType,
  updateFinanceCategoryCostType,
  updateFinanceSettings,
} from "@/lib/finance-settings";
import { hasProFeatures } from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function requireProFinanceApi() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth;
  if (!auth.access.permissions.viewRevenue) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Sem permissão." }, { status: 403 }),
    };
  }
  const org = await prisma.organization.findUnique({
    where: { id: auth.access.organizationId },
    select: { planStatus: true, planTier: true, trialEndsAt: true },
  });
  if (!org || !hasProFeatures(org)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Recurso disponível no plano Pro." },
        { status: 402 },
      ),
    };
  }
  return auth;
}

export async function GET() {
  const auth = await requireProFinanceApi();
  if (!auth.ok) return auth.response;

  const [settings, categories, bankAccounts] = await Promise.all([
    getOrCreateFinanceSettings(auth.access.organizationId),
    listFinanceCategoriesWithCostType(auth.access.organizationId),
    listBankAccounts(auth.access.organizationId),
  ]);

  return NextResponse.json({ settings, categories, bankAccounts });
}

const updateSchema = z.object({
  proLaboreMonthly: z.number().min(0).optional(),
  productiveHoursPerMonth: z.number().int().min(1).max(744).optional(),
  defaultVariableExpensePercent: z.number().min(0).max(100).optional(),
  defaultProfitMarginPercent: z.number().min(0).max(100).optional(),
  monthlyFixedCostsOverride: z.number().min(0).nullable().optional(),
  autoSettleReceivablesOnDueDate: z.boolean().optional(),
  autoCreateProLaboreExpense: z.boolean().optional(),
  paymentMethodFeesJson: z.record(z.string(), z.number()).nullable().optional(),
  categoryCostTypes: z
    .array(
      z.object({
        categoryId: z.string().min(1),
        costType: z.enum(["NONE", "FIXED", "VARIABLE"]),
      }),
    )
    .optional(),
  newBankAccountName: z.string().trim().min(2).max(120).optional(),
});

export async function PUT(request: Request) {
  const auth = await requireProFinanceApi();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  const { categoryCostTypes, newBankAccountName, ...settingsInput } =
    parsed.data;

  const settings = await updateFinanceSettings(
    auth.access.organizationId,
    settingsInput,
  );

  if (categoryCostTypes?.length) {
    for (const row of categoryCostTypes) {
      await updateFinanceCategoryCostType(
        auth.access.organizationId,
        row.categoryId,
        row.costType,
      );
    }
  }

  let bankAccount = null;
  if (newBankAccountName) {
    bankAccount = await createBankAccount(
      auth.access.organizationId,
      newBankAccountName,
    );
  }

  const categories = await listFinanceCategoriesWithCostType(
    auth.access.organizationId,
  );
  const bankAccounts = await listBankAccounts(auth.access.organizationId);

  return NextResponse.json({
    settings,
    categories,
    bankAccounts,
    bankAccount,
  });
}
