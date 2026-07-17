import "server-only";

import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { parseExternalRef, type SaasPlanId, saasPlanById } from "@/lib/asaas-plans";

type AsaasWebhookBody = {
  id?: string | null;
  event?: string;
  payment?: {
    id?: string;
    status?: string;
    value?: number;
    billingType?: string;
    subscription?: string | null;
    externalReference?: string | null;
    paymentDate?: string | null;
    confirmedDate?: string | null;
  } | null;
  subscription?: {
    id?: string;
    status?: string;
    externalReference?: string | null;
  } | null;
};

function syntheticEventId(body: AsaasWebhookBody): string {
  if (body.id) return String(body.id);
  const raw = JSON.stringify({
    event: body.event,
    paymentId: body.payment?.id,
    subscriptionId: body.subscription?.id ?? body.payment?.subscription,
    status: body.payment?.status ?? body.subscription?.status,
  });
  return `syn_${createHash("sha256").update(raw).digest("hex").slice(0, 40)}`;
}

function isPaidStatus(status: string | undefined): boolean {
  if (!status) return false;
  const s = status.toUpperCase();
  return s === "RECEIVED" || s === "CONFIRMED" || s === "RECEIVED_IN_CASH";
}

function isOverdueStatus(status: string | undefined): boolean {
  return (status ?? "").toUpperCase() === "OVERDUE";
}

async function markSaasPaid(orgId: string, planId: SaasPlanId, subscriptionId?: string | null) {
  const plan = saasPlanById(planId);
  if (!plan) return;
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      planStatus: "ACTIVE",
      planTier: plan.tier,
      ...(subscriptionId ? { asaasSubscriptionId: subscriptionId } : {}),
    },
  });
}

async function markSaasPastDue(orgId: string) {
  await prisma.organization.update({
    where: { id: orgId },
    data: { planStatus: "PAST_DUE" },
  });
}

async function markSaasCancelled(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { planCancelAt: true, planStatus: true },
  });
  // Cancelamento pedido pelo salão no fim do período: não zera o acesso antes da data.
  if (
    org?.planStatus === "ACTIVE" &&
    org.planCancelAt != null &&
    org.planCancelAt.getTime() > Date.now()
  ) {
    await prisma.organization.update({
      where: { id: orgId },
      data: { asaasSubscriptionId: null },
    });
    return;
  }
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      planStatus: "CANCELLED",
      planCancelAt: null,
      asaasSubscriptionId: null,
    },
  });
}

async function markAppointmentPaid(appointmentId: string, payment: NonNullable<AsaasWebhookBody["payment"]>) {
  const amount =
    typeof payment.value === "number" && Number.isFinite(payment.value)
      ? payment.value
      : undefined;
  const method =
    payment.billingType?.toUpperCase() === "PIX"
      ? "PIX"
      : payment.billingType?.toUpperCase() === "CREDIT_CARD"
        ? "Cartão"
        : payment.billingType || "Asaas";

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      paymentStatus: "PAID",
      paidAt: new Date(),
      paymentMethod: method.slice(0, 32),
      asaasPaymentId: payment.id ?? undefined,
      ...(amount != null ? { amountPaid: amount } : {}),
    },
  });
}

async function markAppointmentFailed(appointmentId: string) {
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { paymentStatus: "FAILED" },
  });
}

async function markClubPaid(subscriptionId: string, asaasSubId?: string | null) {
  const sub = await prisma.clientSubscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: { select: { cycleDays: true } } },
  });
  if (!sub) return;
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + sub.plan.cycleDays);
  await prisma.clientSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: "ACTIVE",
      currentPeriodEnd: periodEnd,
      visitsUsed: 0,
      ...(asaasSubId ? { asaasSubscriptionId: asaasSubId } : {}),
    },
  });
}

async function markClubPastDue(subscriptionId: string) {
  await prisma.clientSubscription.update({
    where: { id: subscriptionId },
    data: { status: "PAST_DUE" },
  });
}

async function markClubCancelled(subscriptionId: string) {
  await prisma.clientSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: "Cancelado via Asaas",
    },
  });
}

export async function processAsaasWebhook(
  body: AsaasWebhookBody,
): Promise<{ ok: true; duplicate?: boolean } | { ok: false; message: string }> {
  const event = body.event ?? "UNKNOWN";
  const eventId = syntheticEventId(body);

  try {
    await prisma.paymentEvent.create({
      data: {
        asaasEventId: eventId,
        event,
        paymentId: body.payment?.id ?? null,
        subscriptionId:
          body.subscription?.id ?? body.payment?.subscription ?? null,
        externalReference:
          body.payment?.externalReference ??
          body.subscription?.externalReference ??
          null,
        payloadJson: body as object,
      },
    });
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "P2002") {
      return { ok: true, duplicate: true };
    }
    throw err;
  }

  const externalRef =
    body.payment?.externalReference ?? body.subscription?.externalReference ?? null;
  let parsed = parseExternalRef(externalRef);

  // Fallback: achar por IDs Asaas gravados
  if (!parsed && body.payment?.id) {
    const appt = await prisma.appointment.findFirst({
      where: { asaasPaymentId: body.payment.id },
      select: { id: true },
    });
    if (appt) parsed = { kind: "appt", id: appt.id };
  }
  if (!parsed && (body.subscription?.id || body.payment?.subscription)) {
    const subId = body.subscription?.id ?? body.payment?.subscription ?? "";
    const org = await prisma.organization.findFirst({
      where: { asaasSubscriptionId: subId },
      select: { id: true, planTier: true },
    });
    if (org) {
      const planId: SaasPlanId =
        org.planTier === "STARTER" ? "starter" : "pro";
      parsed = { kind: "saas", id: org.id, planId };
    } else {
      const club = await prisma.clientSubscription.findFirst({
        where: { asaasSubscriptionId: subId },
        select: { id: true },
      });
      if (club) parsed = { kind: "club", id: club.id };
    }
  }

  if (!parsed) {
    await prisma.paymentEvent.update({
      where: { asaasEventId: eventId },
      data: { organizationId: null },
    });
    return { ok: true };
  }

  const organizationId =
    parsed.kind === "saas"
      ? parsed.id
      : parsed.kind === "appt"
        ? (
            await prisma.appointment.findUnique({
              where: { id: parsed.id },
              select: { unit: { select: { organizationId: true } } },
            })
          )?.unit?.organizationId ?? null
        : (
            await prisma.clientSubscription.findUnique({
              where: { id: parsed.id },
              select: { organizationId: true },
            })
          )?.organizationId ?? null;

  if (organizationId) {
    await prisma.paymentEvent.update({
      where: { asaasEventId: eventId },
      data: { organizationId },
    });
  }

  const eventUpper = event.toUpperCase();
  const paymentStatus = body.payment?.status;
  const asaasSubId =
    body.subscription?.id ?? body.payment?.subscription ?? null;

  if (parsed.kind === "saas") {
    if (
      eventUpper.includes("PAYMENT_RECEIVED") ||
      eventUpper.includes("PAYMENT_CONFIRMED") ||
      isPaidStatus(paymentStatus)
    ) {
      if (parsed.planId) {
        await markSaasPaid(parsed.id, parsed.planId, asaasSubId);
      }
    } else if (
      eventUpper.includes("PAYMENT_OVERDUE") ||
      isOverdueStatus(paymentStatus)
    ) {
      await markSaasPastDue(parsed.id);
    } else if (
      eventUpper.includes("SUBSCRIPTION_DELETED") ||
      eventUpper.includes("SUBSCRIPTION_INACTIVATED") ||
      (body.subscription?.status ?? "").toUpperCase() === "INACTIVE"
    ) {
      await markSaasCancelled(parsed.id);
    }
  } else if (parsed.kind === "appt") {
    if (
      eventUpper.includes("PAYMENT_RECEIVED") ||
      eventUpper.includes("PAYMENT_CONFIRMED") ||
      isPaidStatus(paymentStatus)
    ) {
      if (body.payment) await markAppointmentPaid(parsed.id, body.payment);
    } else if (
      eventUpper.includes("PAYMENT_DELETED") ||
      eventUpper.includes("PAYMENT_REFUNDED") ||
      eventUpper.includes("PAYMENT_OVERDUE")
    ) {
      await markAppointmentFailed(parsed.id);
    }
  } else if (parsed.kind === "club") {
    if (
      eventUpper.includes("PAYMENT_RECEIVED") ||
      eventUpper.includes("PAYMENT_CONFIRMED") ||
      isPaidStatus(paymentStatus)
    ) {
      await markClubPaid(parsed.id, asaasSubId);
    } else if (
      eventUpper.includes("PAYMENT_OVERDUE") ||
      isOverdueStatus(paymentStatus)
    ) {
      await markClubPastDue(parsed.id);
    } else if (
      eventUpper.includes("SUBSCRIPTION_DELETED") ||
      eventUpper.includes("SUBSCRIPTION_INACTIVATED")
    ) {
      await markClubCancelled(parsed.id);
    }
  }

  return { ok: true };
}
