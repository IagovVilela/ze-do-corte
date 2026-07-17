import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AsaasApiError,
  asaasCreateCustomer,
  asaasCreateSubscription,
  asaasFindCustomerByExternalRef,
  asaasGetPixQrCode,
  asaasListSubscriptionPayments,
  asaasUpdateCustomer,
  getPlatformAsaasApiKey,
  isPlatformAsaasConfigured,
  todayIsoDate,
} from "@/lib/asaas-client";
import { saasExternalRef, saasPlanById, SAAS_PLANS } from "@/lib/asaas-plans";
import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  hasProFeatures,
  isPlanCancelScheduled,
  isTrialActive,
  needsBillingAttention,
  planStatusLabel,
  planTierLabel,
  settleScheduledPlanCancellation,
} from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  planId: z.enum(["starter", "pro"]),
  billingType: z.enum(["PIX", "CREDIT_CARD"]).default("PIX"),
  cpfCnpj: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11 || v.length === 14, {
      message: "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).",
    }),
});

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  await settleScheduledPlanCancellation(auth.access.organizationId);

  const org = await prisma.organization.findUnique({
    where: { id: auth.access.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
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

  return NextResponse.json({
    billing: {
      provider: isPlatformAsaasConfigured() ? "asaas" : "stub",
      platformConfigured: isPlatformAsaasConfigured(),
      organization: {
        ...org,
        planStatusLabel: planStatusLabel(org.planStatus),
        planTierLabel: planTierLabel(org.planTier),
        trialActive: isTrialActive(org),
        hasProFeatures: hasProFeatures(org),
        needsBillingAttention: needsBillingAttention(org),
        cancelScheduled: isPlanCancelScheduled(org),
      },
      plans: SAAS_PLANS.map((p) => ({
        id: p.id,
        name: p.name,
        priceMonthly: p.priceMonthly,
        blurb: p.blurb,
        features: p.features,
      })),
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.role !== "OWNER") {
    return NextResponse.json({ message: "Apenas o proprietário." }, { status: 403 });
  }

  const apiKey = getPlatformAsaasApiKey();
  if (!apiKey || !isPlatformAsaasConfigured()) {
    return NextResponse.json(
      {
        message:
          "Gateway Asaas da plataforma ainda não configurado (ASAAS_API_KEY / ASAAS_WEBHOOK_TOKEN).",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const plan = saasPlanById(parsed.data.planId);
  if (!plan) {
    return NextResponse.json({ message: "Plano inválido." }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: auth.access.organizationId },
  });
  if (!org) {
    return NextResponse.json({ message: "Organização não encontrada." }, { status: 404 });
  }

  const ownerEmail = auth.access.email?.trim() || undefined;
  const externalCustomerRef = `org_customer:${org.id}`;
  const externalSubRef = saasExternalRef(org.id, plan.id);

  try {
    let customerId = org.asaasCustomerId;
    const document = parsed.data.cpfCnpj;

    if (!customerId) {
      const existing = await asaasFindCustomerByExternalRef(
        apiKey,
        externalCustomerRef,
      );
      if (existing) {
        customerId = existing.id;
      } else {
        const created = await asaasCreateCustomer(apiKey, {
          name: org.name,
          email: ownerEmail,
          cpfCnpj: document,
          externalReference: externalCustomerRef,
        });
        customerId = created.id;
      }
      await prisma.organization.update({
        where: { id: org.id },
        data: { asaasCustomerId: customerId },
      });
    }

    // Cliente antigo pode ter sido criado sem CPF — Asaas exige documento no PIX.
    await asaasUpdateCustomer(apiKey, customerId, {
      name: org.name,
      email: ownerEmail,
      cpfCnpj: document,
    });

    const billingType = parsed.data.billingType;

    const subscription = await asaasCreateSubscription(apiKey, {
      customer: customerId,
      billingType,
      value: plan.priceMonthly,
      nextDueDate: todayIsoDate(),
      cycle: "MONTHLY",
      description: `Barbernegon ${plan.name}`,
      externalReference: externalSubRef,
    });

    await prisma.organization.update({
      where: { id: org.id },
      data: {
        asaasSubscriptionId: subscription.id,
        planTier: plan.tier,
        // Mantém TRIAL/PAST_DUE até pagamento; ACTIVE via webhook
      },
    });

    const payments = await asaasListSubscriptionPayments(apiKey, subscription.id);
    const first = payments[0];
    let pix: { encodedImage?: string; payload?: string; expirationDate?: string } | null =
      null;
    let invoiceUrl: string | null = first?.invoiceUrl ?? null;

    if (billingType === "PIX" && first?.id) {
      try {
        pix = await asaasGetPixQrCode(apiKey, first.id);
      } catch {
        pix = null;
      }
    }

    const message =
      billingType === "CREDIT_CARD"
        ? "Assinatura criada. Abra a fatura Asaas, cadastre o cartão uma vez — as próximas cobranças são automáticas."
        : "Assinatura criada. Pague o PIX (ou o link da fatura) para ativar o plano. Todo mês uma nova fatura será gerada para pagar.";

    return NextResponse.json({
      ok: true,
      billingType,
      subscriptionId: subscription.id,
      paymentId: first?.id ?? null,
      invoiceUrl,
      pix,
      message,
    });
  } catch (error) {
    console.error("POST /api/platform/billing", error);
    const message =
      error instanceof AsaasApiError
        ? error.message
        : "Não foi possível iniciar a cobrança.";
    return NextResponse.json({ message }, { status: 502 });
  }
}
