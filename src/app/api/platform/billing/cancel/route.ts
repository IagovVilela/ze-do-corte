import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AsaasApiError,
  asaasCancelSubscription,
  asaasGetSubscription,
  getPlatformAsaasApiKey,
  isPlatformAsaasConfigured,
} from "@/lib/asaas-client";
import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  isPlanCancelScheduled,
  settleScheduledPlanCancellation,
} from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const cancelSchema = z.object({
  reason: z.string().trim().max(240).optional().nullable(),
});

function defaultPeriodEnd(from = new Date()): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + 30);
  end.setHours(23, 59, 59, 999);
  return end;
}

function parseAsaasDateEndOfDay(isoDate: string): Date {
  const parsed = new Date(`${isoDate}T23:59:59.999-03:00`);
  if (Number.isNaN(parsed.getTime())) {
    return defaultPeriodEnd();
  }
  return parsed;
}

/**
 * Cancelamento do plano SaaS da barbearia.
 * POST /api/platform/billing/cancel
 *
 * - TRIAL / PAST_DUE → Cancelado na hora
 * - ACTIVE → para cobranças no Asaas; acesso até o fim do período já pago
 */
export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.role !== "OWNER") {
    return NextResponse.json({ message: "Apenas o proprietário." }, { status: 403 });
  }

  await settleScheduledPlanCancellation(auth.access.organizationId);

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = cancelSchema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason?.trim() || null : null;

  const org = await prisma.organization.findUnique({
    where: { id: auth.access.organizationId },
    select: {
      id: true,
      planStatus: true,
      planTier: true,
      trialEndsAt: true,
      planCancelAt: true,
      asaasSubscriptionId: true,
    },
  });

  if (!org) {
    return NextResponse.json({ message: "Organização não encontrada." }, { status: 404 });
  }

  if (org.planStatus === "CANCELLED") {
    return NextResponse.json({
      ok: true,
      organization: org,
      message: "Plano já está cancelado.",
    });
  }

  if (isPlanCancelScheduled(org)) {
    return NextResponse.json({
      ok: true,
      organization: org,
      message: `Cancelamento já agendado para ${org.planCancelAt!.toLocaleDateString("pt-BR")}.`,
    });
  }

  const apiKey = getPlatformAsaasApiKey();
  let periodEnd: Date | null = null;

  if (org.asaasSubscriptionId && apiKey && isPlatformAsaasConfigured()) {
    try {
      if (org.planStatus === "ACTIVE") {
        const sub = await asaasGetSubscription(apiKey, org.asaasSubscriptionId);
        periodEnd = parseAsaasDateEndOfDay(sub.nextDueDate);
      }
      await asaasCancelSubscription(apiKey, org.asaasSubscriptionId);
    } catch (error) {
      console.error("POST /api/platform/billing/cancel asaas", error);
      if (!(error instanceof AsaasApiError && error.status === 404)) {
        const message =
          error instanceof AsaasApiError
            ? error.message
            : "Não foi possível cancelar a assinatura no Asaas.";
        return NextResponse.json({ message }, { status: 502 });
      }
    }
  }

  if (org.planStatus === "ACTIVE") {
    const cancelAt = periodEnd ?? defaultPeriodEnd();
    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: {
        planCancelAt: cancelAt,
        asaasSubscriptionId: null,
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
      cancelReason: reason,
      message: `Cancelamento agendado. Você continua com acesso até ${cancelAt.toLocaleDateString("pt-BR")}. Sem novas cobranças.`,
    });
  }

  // TRIAL ou PAST_DUE → Free forever (não apaga a conta)
  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: {
      planStatus: "ACTIVE",
      planTier: "FREE",
      planCancelAt: null,
      asaasSubscriptionId: null,
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
    cancelReason: reason,
    message:
      org.planStatus === "TRIAL"
        ? "Trial encerrado. Você continua no Free com site e agenda."
        : "Assinatura encerrada. Você continua no Free com site e agenda.",
  });
}
