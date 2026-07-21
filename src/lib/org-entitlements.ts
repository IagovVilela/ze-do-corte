import "server-only";

import type {
  OrganizationPlanStatus,
  OrganizationPlanTier,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type OrgBillingSlice = Pick<
  import("@prisma/client").Organization,
  "planStatus" | "planTier" | "trialEndsAt"
> & {
  planCancelAt?: Date | null;
};

const billingSelect = {
  planStatus: true,
  planTier: true,
  trialEndsAt: true,
  planCancelAt: true,
} as const;

/** Trial ainda válido (ou org sem data de fim = trata como trial aberto). */
export function isTrialActive(org: OrgBillingSlice, now = new Date()): boolean {
  if (org.planStatus !== "TRIAL") return false;
  if (!org.trialEndsAt) return true;
  return org.trialEndsAt.getTime() > now.getTime();
}

/** Cancelamento do SaaS já pedido, mas ainda no período pago. */
export function isPlanCancelScheduled(
  org: Pick<OrgBillingSlice, "planStatus" | "planCancelAt">,
  now = new Date(),
): boolean {
  if (org.planStatus !== "ACTIVE") return false;
  if (!org.planCancelAt) return false;
  return org.planCancelAt.getTime() > now.getTime();
}

export function isFreeTier(org: Pick<OrgBillingSlice, "planTier">): boolean {
  return org.planTier === "FREE" || org.planTier === "STARTER";
}

/**
 * Se `planCancelAt` já passou e o status ainda é ACTIVE, cai no Free forever.
 */
export async function settleScheduledPlanCancellation(
  organizationId: string,
  now = new Date(),
): Promise<OrgBillingSlice | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: billingSelect,
  });
  if (!org) return null;

  if (
    org.planStatus === "ACTIVE" &&
    org.planCancelAt != null &&
    org.planCancelAt.getTime() <= now.getTime()
  ) {
    return prisma.organization.update({
      where: { id: organizationId },
      data: {
        planStatus: "ACTIVE",
        planTier: "FREE",
        planCancelAt: null,
        asaasSubscriptionId: null,
      },
      select: billingSelect,
    });
  }

  return org;
}

/**
 * Trial expirado sem assinatura Pro → Free forever (ACTIVE + FREE).
 */
export async function settleExpiredTrialToFree(
  organizationId: string,
  now = new Date(),
): Promise<OrgBillingSlice | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: billingSelect,
  });
  if (!org) return null;

  if (org.planStatus === "TRIAL" && !isTrialActive(org, now)) {
    return prisma.organization.update({
      where: { id: organizationId },
      data: {
        planStatus: "ACTIVE",
        planTier: "FREE",
        planCancelAt: null,
      },
      select: billingSelect,
    });
  }

  return org;
}

/** Roda settles de billing (trial → Free e cancelamento agendado → Free). */
export async function settleOrgBillingState(
  organizationId: string,
  now = new Date(),
): Promise<OrgBillingSlice | null> {
  await settleExpiredTrialToFree(organizationId, now);
  return settleScheduledPlanCancellation(organizationId, now);
}

/** Pode usar o produto (agenda/admin básico). Free forever incluso. */
export function hasPlatformAccess(org: OrgBillingSlice, now = new Date()): boolean {
  if (org.planStatus === "ACTIVE") return true;
  if (isTrialActive(org, now)) return true;
  if (org.planStatus === "PAST_DUE") return true;
  if (org.planStatus === "CANCELLED") return true;
  return false;
}

/** Features Pro (caixa + clube) — trial ativo ou Pro pago. */
export function hasProFeatures(org: OrgBillingSlice, now = new Date()): boolean {
  if (isTrialActive(org, now)) return true;
  if (org.planStatus === "ACTIVE" && org.planTier === "PRO") return true;
  return false;
}

/**
 * Aviso de upsell / atenção:
 * — Free ACTIVE → upsell suave para Pro
 * — PAST_DUE / CANCELLED / trial expirado (antes do settle) → regularizar ou upsell
 */
export function needsBillingAttention(
  org: OrgBillingSlice,
  now = new Date(),
): boolean {
  if (isPlanCancelScheduled(org, now)) return false;
  if (org.planStatus === "ACTIVE" && org.planTier === "PRO") return false;
  if (isTrialActive(org, now)) return false;
  return true;
}

/** Free ACTIVE (já settled) — banner de upsell, não “conta bloqueada”. */
export function isFreePlanUpsell(
  org: OrgBillingSlice,
  now = new Date(),
): boolean {
  if (isTrialActive(org, now)) return false;
  return org.planStatus === "ACTIVE" && isFreeTier(org);
}

/** Free (ou Starter legado) pode ter no máximo 1 unidade ativa. */
export function freeTierAllowsAnotherActiveUnit(
  org: OrgBillingSlice,
  activeUnitCount: number,
  now = new Date(),
): boolean {
  if (hasProFeatures(org, now)) return true;
  return activeUnitCount < 1;
}

export function planStatusLabel(status: OrganizationPlanStatus): string {
  switch (status) {
    case "TRIAL":
      return "Trial Pro";
    case "ACTIVE":
      return "Ativo";
    case "PAST_DUE":
      return "Pagamento pendente";
    case "CANCELLED":
      return "Cancelado";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function planTierLabel(tier: OrganizationPlanTier): string {
  switch (tier) {
    case "TRIAL_FULL":
      return "Trial (Pro completo)";
    case "STARTER":
      return "Free (legado Starter)";
    case "FREE":
      return "Free";
    case "PRO":
      return "Pro";
    default: {
      const _exhaustive: never = tier;
      return _exhaustive;
    }
  }
}
