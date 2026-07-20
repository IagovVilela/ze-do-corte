import "server-only";

import type { ClientSubscription, SubscriptionPlan } from "@prisma/client";
import { addDays, format } from "date-fns";

import {
  asaasCancelSubscription,
  asaasUpdateSubscription,
} from "@/lib/asaas-client";
import { getOrgAsaasApiKey } from "@/lib/asaas-org";
import { notifyClubClient } from "@/lib/club-notify-client";
import { prisma } from "@/lib/prisma";

type ClubSubWithPlan = ClientSubscription & {
  plan: Pick<SubscriptionPlan, "name" | "cycleDays">;
};

async function loadOrgSub(
  organizationId: string,
  subscriptionId: string,
): Promise<ClubSubWithPlan | null> {
  return prisma.clientSubscription.findFirst({
    where: { id: subscriptionId, organizationId },
    include: { plan: { select: { name: true, cycleDays: true } } },
  });
}

async function syncAsaasStatus(
  organizationId: string,
  asaasSubscriptionId: string | null | undefined,
  status: "ACTIVE" | "INACTIVE",
): Promise<void> {
  if (!asaasSubscriptionId) return;
  const apiKey = await getOrgAsaasApiKey(organizationId);
  if (!apiKey) return;
  try {
    await asaasUpdateSubscription(apiKey, asaasSubscriptionId, { status });
  } catch (err) {
    console.error("[club-actions] asaas update status", err);
  }
}

export async function cancelClubSubscription(options: {
  organizationId: string;
  subscriptionId: string;
  reason?: string | null;
  notify?: boolean;
}): Promise<
  | { ok: true; subscription: ClubSubWithPlan; message: string }
  | { ok: false; status: number; message: string }
> {
  const existing = await loadOrgSub(
    options.organizationId,
    options.subscriptionId,
  );
  if (!existing) {
    return { ok: false, status: 404, message: "Assinatura não encontrada." };
  }
  if (existing.status === "CANCELLED") {
    return {
      ok: true,
      subscription: existing,
      message: "Assinatura já estava cancelada.",
    };
  }

  if (existing.asaasSubscriptionId) {
    const apiKey = await getOrgAsaasApiKey(options.organizationId);
    if (apiKey) {
      try {
        await asaasCancelSubscription(apiKey, existing.asaasSubscriptionId);
      } catch (err) {
        console.error("[club-actions] cancel asaas", err);
      }
    }
  }

  const reason = options.reason?.trim() || "Cancelado pelo painel";
  const subscription = await prisma.clientSubscription.update({
    where: { id: existing.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason,
    },
    include: { plan: { select: { name: true, cycleDays: true } } },
  });

  if (options.notify !== false) {
    void notifyClubClient({
      organizationId: options.organizationId,
      clientName: subscription.clientName,
      clientPhone: subscription.clientPhone,
      clientEmail: subscription.clientEmail,
      planName: subscription.plan.name,
      event: "cancelled",
      reason,
    });
  }

  return {
    ok: true,
    subscription,
    message: "Assinatura cancelada. Sem cobranças futuras neste clube.",
  };
}

export async function pauseClubSubscription(options: {
  organizationId: string;
  subscriptionId: string;
  reason?: string | null;
}): Promise<
  | { ok: true; subscription: ClubSubWithPlan; message: string }
  | { ok: false; status: number; message: string }
> {
  const existing = await loadOrgSub(
    options.organizationId,
    options.subscriptionId,
  );
  if (!existing) {
    return { ok: false, status: 404, message: "Assinatura não encontrada." };
  }
  if (existing.status === "CANCELLED") {
    return {
      ok: false,
      status: 400,
      message: "Assinatura cancelada não pode ser pausada.",
    };
  }
  if (existing.status === "PAUSED") {
    return {
      ok: true,
      subscription: existing,
      message: "Assinatura já estava pausada.",
    };
  }

  await syncAsaasStatus(
    options.organizationId,
    existing.asaasSubscriptionId,
    "INACTIVE",
  );

  const reason = options.reason?.trim() || "Pausado pelo painel";
  const subscription = await prisma.clientSubscription.update({
    where: { id: existing.id },
    data: {
      status: "PAUSED",
      cancelReason: reason,
      cancelledAt: null,
    },
    include: { plan: { select: { name: true, cycleDays: true } } },
  });

  void notifyClubClient({
    organizationId: options.organizationId,
    clientName: subscription.clientName,
    clientPhone: subscription.clientPhone,
    clientEmail: subscription.clientEmail,
    planName: subscription.plan.name,
    event: "paused",
    reason,
  });

  return {
    ok: true,
    subscription,
    message: "Assinatura pausada. O cliente não usa o clube até reativar.",
  };
}

export async function resumeClubSubscription(options: {
  organizationId: string;
  subscriptionId: string;
}): Promise<
  | { ok: true; subscription: ClubSubWithPlan; message: string }
  | { ok: false; status: number; message: string }
> {
  const existing = await loadOrgSub(
    options.organizationId,
    options.subscriptionId,
  );
  if (!existing) {
    return { ok: false, status: 404, message: "Assinatura não encontrada." };
  }
  if (existing.status === "CANCELLED") {
    return {
      ok: false,
      status: 400,
      message: "Assinatura cancelada. Crie uma nova adesão.",
    };
  }
  if (existing.status === "ACTIVE") {
    return {
      ok: true,
      subscription: existing,
      message: "Assinatura já estava ativa.",
    };
  }

  await syncAsaasStatus(
    options.organizationId,
    existing.asaasSubscriptionId,
    "ACTIVE",
  );

  const subscription = await prisma.clientSubscription.update({
    where: { id: existing.id },
    data: {
      status: "ACTIVE",
      cancelReason: null,
      cancelledAt: null,
    },
    include: { plan: { select: { name: true, cycleDays: true } } },
  });

  void notifyClubClient({
    organizationId: options.organizationId,
    clientName: subscription.clientName,
    clientPhone: subscription.clientPhone,
    clientEmail: subscription.clientEmail,
    planName: subscription.plan.name,
    event: "resumed",
  });

  return {
    ok: true,
    subscription,
    message: "Assinatura reativada. O cliente volta a usar o clube.",
  };
}

export async function postponeClubSubscription(options: {
  organizationId: string;
  subscriptionId: string;
  days: number;
}): Promise<
  | { ok: true; subscription: ClubSubWithPlan; message: string }
  | { ok: false; status: number; message: string }
> {
  const days = Math.floor(options.days);
  if (!Number.isFinite(days) || days < 1 || days > 90) {
    return {
      ok: false,
      status: 400,
      message: "Informe entre 1 e 90 dias para postergar.",
    };
  }

  const existing = await loadOrgSub(
    options.organizationId,
    options.subscriptionId,
  );
  if (!existing) {
    return { ok: false, status: 404, message: "Assinatura não encontrada." };
  }
  if (existing.status === "CANCELLED") {
    return {
      ok: false,
      status: 400,
      message: "Assinatura cancelada não pode ser postergada.",
    };
  }

  const base =
    existing.currentPeriodEnd.getTime() > Date.now()
      ? existing.currentPeriodEnd
      : new Date();
  const newEnd = addDays(base, days);
  const nextDueDate = format(newEnd, "yyyy-MM-dd");

  if (existing.asaasSubscriptionId) {
    const apiKey = await getOrgAsaasApiKey(options.organizationId);
    if (apiKey) {
      try {
        await asaasUpdateSubscription(apiKey, existing.asaasSubscriptionId, {
          nextDueDate,
          status: "ACTIVE",
        });
      } catch (err) {
        console.error("[club-actions] postpone asaas", err);
        return {
          ok: false,
          status: 502,
          message:
            "Não foi possível atualizar a cobrança na Asaas. Tente de novo.",
        };
      }
    }
  }

  const subscription = await prisma.clientSubscription.update({
    where: { id: existing.id },
    data: {
      currentPeriodEnd: newEnd,
      status: existing.status === "PAST_DUE" ? "ACTIVE" : existing.status,
      cancelReason: null,
      cancelledAt: null,
    },
    include: { plan: { select: { name: true, cycleDays: true } } },
  });

  void notifyClubClient({
    organizationId: options.organizationId,
    clientName: subscription.clientName,
    clientPhone: subscription.clientPhone,
    clientEmail: subscription.clientEmail,
    planName: subscription.plan.name,
    event: "postponed",
    until: newEnd,
  });

  return {
    ok: true,
    subscription,
    message: `Assinatura postergada em ${days} dia(s). Novo prazo: ${format(newEnd, "dd/MM/yyyy")}.`,
  };
}
