import { NextResponse } from "next/server";

import {
  AsaasApiError,
  asaasCreateSubscription,
  getPlatformAsaasApiKey,
  isPlatformAsaasConfigured,
  todayIsoDate,
} from "@/lib/asaas-client";
import { saasExternalRef, saasPlanByTier } from "@/lib/asaas-plans";
import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  isPlanCancelScheduled,
  settleScheduledPlanCancellation,
} from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Desfaz cancelamento agendado enquanto ainda há período pago.
 * POST /api/platform/billing/undo-cancel
 */
export async function POST() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.role !== "OWNER") {
    return NextResponse.json({ message: "Apenas o proprietário." }, { status: 403 });
  }

  await settleScheduledPlanCancellation(auth.access.organizationId);

  const org = await prisma.organization.findUnique({
    where: { id: auth.access.organizationId },
    select: {
      id: true,
      name: true,
      planStatus: true,
      planTier: true,
      trialEndsAt: true,
      planCancelAt: true,
      asaasCustomerId: true,
      asaasSubscriptionId: true,
    },
  });

  if (!org) {
    return NextResponse.json({ message: "Organização não encontrada." }, { status: 404 });
  }

  if (!isPlanCancelScheduled(org)) {
    return NextResponse.json(
      {
        message:
          org.planStatus === "CANCELLED"
            ? "Plano já cancelado. Assine novamente em Planos."
            : "Não há cancelamento agendado para desfazer.",
      },
      { status: 400 },
    );
  }

  const plan = saasPlanByTier(org.planTier);
  const apiKey = getPlatformAsaasApiKey();
  let asaasSubscriptionId: string | null = org.asaasSubscriptionId;

  if (plan && org.asaasCustomerId && apiKey && isPlatformAsaasConfigured()) {
    try {
      const nextDue =
        org.planCancelAt?.toISOString().slice(0, 10) ?? todayIsoDate();
      const subscription = await asaasCreateSubscription(apiKey, {
        customer: org.asaasCustomerId,
        billingType: "PIX",
        value: plan.priceMonthly,
        nextDueDate: nextDue,
        cycle: "MONTHLY",
        description: `Barbernegon ${plan.name}`,
        externalReference: saasExternalRef(org.id, plan.id),
      });
      asaasSubscriptionId = subscription.id;
    } catch (error) {
      console.error("POST /api/platform/billing/undo-cancel asaas", error);
      const message =
        error instanceof AsaasApiError
          ? error.message
          : "Não foi possível reativar a cobrança no Asaas.";
      return NextResponse.json({ message }, { status: 502 });
    }
  }

  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: {
      planCancelAt: null,
      ...(asaasSubscriptionId ? { asaasSubscriptionId } : {}),
    },
    select: {
      planStatus: true,
      planTier: true,
      trialEndsAt: true,
      planCancelAt: true,
      asaasSubscriptionId: true,
    },
  });

  return NextResponse.json({
    ok: true,
    organization: updated,
    message: asaasSubscriptionId
      ? "Cancelamento desfeito. A cobrança mensal voltará a ser gerada no Asaas."
      : "Cancelamento desfeito. Renove a assinatura em Planos se a cobrança não for gerada automaticamente.",
  });
}
