import "server-only";

import {
  AsaasApiError,
  asaasCreateCustomer,
  asaasCreateSubscription,
  asaasFindCustomerByExternalRef,
  asaasGetPixQrCode,
  asaasListSubscriptionPayments,
  asaasUpdateCustomer,
  cycleFromDays,
  todayIsoDate,
} from "@/lib/asaas-client";
import { getOrgAsaasApiKey } from "@/lib/asaas-org";
import { clubExternalRef } from "@/lib/asaas-plans";
import { brPhoneDigits, formatBrPhoneNational } from "@/lib/br-phone-format";
import { hasProFeatures } from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";

export type ClubPixPayload = {
  encodedImage?: string | null;
  payload?: string | null;
  expirationDate?: string | null;
};

export type ClubSubscribeInput = {
  organizationId: string;
  planId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  clientCpfCnpj?: string | null;
  notes?: string | null;
  /** Se false, cadastra ACTIVE sem Asaas. Default: cobra se Asaas ligado. */
  chargeOnline?: boolean;
};

export type ClubSubscribeResult =
  | {
      ok: true;
      subscription: {
        id: string;
        status: string;
        clientName: string;
        clientPhone: string;
        currentPeriodEnd: Date;
        plan: { id: string; name: string };
      };
      invoiceUrl: string | null;
      pix: ClubPixPayload | null;
      asaasSubscriptionId: string | null;
      message: string;
      chargedOnline: boolean;
    }
  | { ok: false; message: string; status: number };

async function loadOrgBilling(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      planStatus: true,
      planTier: true,
      trialEndsAt: true,
      asaasEnabled: true,
    },
  });
}

/** Lista planos ativos do clube para página pública / admin. */
export async function listPublicClubPlans(organizationId: string) {
  return prisma.subscriptionPlan.findMany({
    where: { organizationId, isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      cycleDays: true,
      visitsIncluded: true,
      services: {
        select: { service: { select: { id: true, name: true } } },
      },
    },
    orderBy: { price: "asc" },
  });
}

export async function orgClubPublicAvailable(organizationId: string): Promise<{
  ok: boolean;
  message?: string;
  orgName?: string;
}> {
  const org = await loadOrgBilling(organizationId);
  if (!org) return { ok: false, message: "Barbearia não encontrada." };
  if (!hasProFeatures(org)) {
    return {
      ok: false,
      message: "Clube indisponível para esta barbearia no momento.",
    };
  }
  const apiKey = await getOrgAsaasApiKey(organizationId);
  if (!apiKey) {
    return {
      ok: false,
      message:
        "A barbearia ainda não configurou o recebimento online do clube.",
    };
  }
  return { ok: true, orgName: org.name };
}

/**
 * Cria assinatura do clube (local + Asaas PIX quando possível).
 * Devolve QR/fatura para o cliente pagar.
 */
export async function createClubSubscription(
  input: ClubSubscribeInput,
): Promise<ClubSubscribeResult> {
  const org = await loadOrgBilling(input.organizationId);
  if (!org) {
    return { ok: false, message: "Organização não encontrada.", status: 404 };
  }
  if (!hasProFeatures(org)) {
    return {
      ok: false,
      message: "Clube disponível no plano Pro (ou no trial).",
      status: 403,
    };
  }

  const plan = await prisma.subscriptionPlan.findFirst({
    where: {
      id: input.planId,
      organizationId: input.organizationId,
      isActive: true,
    },
  });
  if (!plan) {
    return { ok: false, message: "Plano inválido.", status: 400 };
  }

  const phoneStored = formatBrPhoneNational(input.clientPhone);
  const digits = brPhoneDigits(input.clientPhone);
  if (digits.length < 10) {
    return {
      ok: false,
      message: "Informe um telefone válido com DDD.",
      status: 400,
    };
  }

  const openSubs = await prisma.clientSubscription.findMany({
    where: {
      organizationId: input.organizationId,
      status: { in: ["ACTIVE", "PAST_DUE"] },
    },
    select: {
      id: true,
      clientPhone: true,
      status: true,
      plan: { select: { name: true } },
    },
  });
  const samePhone = openSubs.find(
    (s) => brPhoneDigits(s.clientPhone) === digits,
  );
  if (samePhone) {
    return {
      ok: false,
      message:
        samePhone.status === "ACTIVE"
          ? `Este telefone já tem o clube ativo (${samePhone.plan.name}).`
          : `Já existe adesão pendente de pagamento para este telefone (${samePhone.plan.name}).`,
      status: 409,
    };
  }

  const currentPeriodEnd = new Date();
  currentPeriodEnd.setDate(currentPeriodEnd.getDate() + plan.cycleDays);

  const apiKey = await getOrgAsaasApiKey(input.organizationId);
  const chargeOnline = input.chargeOnline ?? Boolean(apiKey);

  if (!chargeOnline || !apiKey) {
    const subscription = await prisma.clientSubscription.create({
      data: {
        organizationId: input.organizationId,
        planId: plan.id,
        clientName: input.clientName.trim(),
        clientPhone: phoneStored,
        clientEmail: input.clientEmail?.trim() || null,
        notes: input.notes ?? null,
        status: "ACTIVE",
        currentPeriodEnd,
        visitsUsed: 0,
      },
      include: { plan: { select: { id: true, name: true } } },
    });
    return {
      ok: true,
      subscription,
      invoiceUrl: null,
      pix: null,
      asaasSubscriptionId: null,
      chargedOnline: false,
      message: "Assinante cadastrado (sem cobrança online).",
    };
  }

  const document = input.clientCpfCnpj?.replace(/\D/g, "") || null;
  if (!document || (document.length !== 11 && document.length !== 14)) {
    return {
      ok: false,
      message: "CPF ou CNPJ é obrigatório para gerar o PIX do clube.",
      status: 400,
    };
  }

  const subscription = await prisma.clientSubscription.create({
    data: {
      organizationId: input.organizationId,
      planId: plan.id,
      clientName: input.clientName.trim(),
      clientPhone: phoneStored,
      clientEmail: input.clientEmail?.trim() || null,
      notes: input.notes ?? null,
      status: "PAST_DUE",
      currentPeriodEnd,
      visitsUsed: 0,
    },
    include: { plan: { select: { id: true, name: true } } },
  });

  try {
    const customerRef = `club_customer:${input.organizationId}:${digits}`;
    let customer = await asaasFindCustomerByExternalRef(apiKey, customerRef);
    if (!customer) {
      customer = await asaasCreateCustomer(apiKey, {
        name: input.clientName.trim(),
        email: input.clientEmail || null,
        mobilePhone: digits.slice(-11),
        cpfCnpj: document,
        externalReference: customerRef,
      });
    } else {
      await asaasUpdateCustomer(apiKey, customer.id, {
        name: input.clientName.trim(),
        email: input.clientEmail || null,
        cpfCnpj: document,
      });
    }

    const asaasSub = await asaasCreateSubscription(apiKey, {
      customer: customer.id,
      billingType: "PIX",
      value: Number(plan.price),
      nextDueDate: todayIsoDate(),
      cycle: cycleFromDays(plan.cycleDays),
      description: `Clube · ${plan.name} · ${org.name}`,
      externalReference: clubExternalRef(subscription.id),
    });

    const updated = await prisma.clientSubscription.update({
      where: { id: subscription.id },
      data: {
        asaasCustomerId: customer.id,
        asaasSubscriptionId: asaasSub.id,
      },
      include: { plan: { select: { id: true, name: true } } },
    });

    const payments = await asaasListSubscriptionPayments(apiKey, asaasSub.id);
    const first = payments[0];
    let pix: ClubPixPayload | null = null;
    const invoiceUrl = first?.invoiceUrl ?? null;
    if (first?.id) {
      try {
        pix = await asaasGetPixQrCode(apiKey, first.id);
      } catch {
        pix = null;
      }
    }

    return {
      ok: true,
      subscription: updated,
      invoiceUrl,
      pix,
      asaasSubscriptionId: asaasSub.id,
      chargedOnline: true,
      message:
        "PIX gerado. Após o pagamento o clube ativa sozinho e o crédito vale no agendamento.",
    };
  } catch (error) {
    console.error("createClubSubscription asaas", error);
    await prisma.clientSubscription.update({
      where: { id: subscription.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: "Falha ao criar cobrança Asaas",
        notes: [subscription.notes, "Falha Asaas na adesão"]
          .filter(Boolean)
          .join(" · ")
          .slice(0, 240),
      },
    });
    const message =
      error instanceof AsaasApiError
        ? error.message
        : "Não foi possível gerar a cobrança do clube.";
    return { ok: false, message, status: 502 };
  }
}
