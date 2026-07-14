import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  AsaasApiError,
  asaasCreateCustomer,
  asaasCreateSubscription,
  asaasFindCustomerByExternalRef,
  cycleFromDays,
  todayIsoDate,
} from "@/lib/asaas-client";
import { getOrgAsaasApiKey } from "@/lib/asaas-org";
import { clubExternalRef } from "@/lib/asaas-plans";
import { formatBrPhoneNational } from "@/lib/br-phone-format";
import { hasProFeatures } from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  planId: z.string().min(1),
  clientName: z.string().trim().min(2).max(80),
  clientPhone: z.string().trim().min(8).max(32),
  clientEmail: z.string().trim().email().optional().or(z.literal("")),
  clientCpfCnpj: z.string().trim().min(11).max(18).optional().or(z.literal("")),
  notes: z.string().trim().max(240).optional().nullable(),
  chargeOnline: z.boolean().optional(),
});

async function assertProClubAccess(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { planStatus: true, planTier: true, trialEndsAt: true },
  });
  if (!org || !hasProFeatures(org)) {
    return NextResponse.json(
      {
        message:
          "Clube disponível no plano Pro (ou durante o trial). Faça upgrade em Plano.",
      },
      { status: 403 },
    );
  }
  return null;
}

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageSubscriptions) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
  const denied = await assertProClubAccess(auth.access.organizationId);
  if (denied) return denied;

  const subscriptions = await prisma.clientSubscription.findMany({
    where: { organizationId: auth.access.organizationId },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          price: true,
          cycleDays: true,
          visitsIncluded: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ subscriptions });
}

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageSubscriptions) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
  const denied = await assertProClubAccess(auth.access.organizationId);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const plan = await prisma.subscriptionPlan.findFirst({
    where: {
      id: parsed.data.planId,
      organizationId: auth.access.organizationId,
      isActive: true,
    },
  });
  if (!plan) {
    return NextResponse.json({ message: "Plano inválido." }, { status: 400 });
  }

  const currentPeriodEnd = new Date();
  currentPeriodEnd.setDate(currentPeriodEnd.getDate() + plan.cycleDays);
  const phoneStored = formatBrPhoneNational(parsed.data.clientPhone);

  const apiKey = await getOrgAsaasApiKey(auth.access.organizationId);
  const chargeOnline = parsed.data.chargeOnline ?? Boolean(apiKey);

  if (!chargeOnline || !apiKey) {
    const subscription = await prisma.clientSubscription.create({
      data: {
        organizationId: auth.access.organizationId,
        planId: plan.id,
        clientName: parsed.data.clientName,
        clientPhone: phoneStored,
        clientEmail: parsed.data.clientEmail || null,
        notes: parsed.data.notes ?? null,
        status: "ACTIVE",
        currentPeriodEnd,
      },
      include: { plan: { select: { name: true } } },
    });
    return NextResponse.json(
      {
        subscription,
        message: "Assinante cadastrado (sem cobrança online).",
      },
      { status: 201 },
    );
  }

  const subscription = await prisma.clientSubscription.create({
    data: {
      organizationId: auth.access.organizationId,
      planId: plan.id,
      clientName: parsed.data.clientName,
      clientPhone: phoneStored,
      clientEmail: parsed.data.clientEmail || null,
      notes: parsed.data.notes ?? null,
      status: "PAST_DUE",
      currentPeriodEnd,
    },
    include: { plan: { select: { name: true } } },
  });

  try {
    const customerRef = `club_customer:${auth.access.organizationId}:${phoneStored.replace(/\D/g, "")}`;
    let customer = await asaasFindCustomerByExternalRef(apiKey, customerRef);
    if (!customer) {
      customer = await asaasCreateCustomer(apiKey, {
        name: parsed.data.clientName,
        email: parsed.data.clientEmail || null,
        mobilePhone: phoneStored.replace(/\D/g, "").slice(-11),
        cpfCnpj: parsed.data.clientCpfCnpj || null,
        externalReference: customerRef,
      });
    }

    const asaasSub = await asaasCreateSubscription(apiKey, {
      customer: customer.id,
      billingType: "PIX",
      value: Number(plan.price),
      nextDueDate: todayIsoDate(),
      cycle: cycleFromDays(plan.cycleDays),
      description: `Clube · ${plan.name}`,
      externalReference: clubExternalRef(subscription.id),
    });

    const updated = await prisma.clientSubscription.update({
      where: { id: subscription.id },
      data: {
        asaasCustomerId: customer.id,
        asaasSubscriptionId: asaasSub.id,
      },
      include: { plan: { select: { name: true } } },
    });

    return NextResponse.json(
      {
        subscription: updated,
        asaasSubscriptionId: asaasSub.id,
        message:
          "Assinatura Asaas criada. Fica ativa após o pagamento (webhook).",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST client-subscriptions asaas", error);
    const updated = await prisma.clientSubscription.update({
      where: { id: subscription.id },
      data: {
        status: "ACTIVE",
        notes: [subscription.notes, "Falha Asaas — cadastro local ativo"]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 240),
      },
      include: { plan: { select: { name: true } } },
    });
    const message =
      error instanceof AsaasApiError
        ? `Cadastrado localmente; Asaas falhou: ${error.message}`
        : "Cadastrado localmente; falha ao cobrar no Asaas.";
    return NextResponse.json(
      { subscription: updated, message, asaasError: true },
      { status: 201 },
    );
  }
}
