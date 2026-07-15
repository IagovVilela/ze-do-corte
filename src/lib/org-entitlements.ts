import "server-only";

import type {
  Organization,
  OrganizationPlanStatus,
  OrganizationPlanTier,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type OrgBillingSlice = Pick<
  Organization,
  "planStatus" | "planTier" | "trialEndsAt"
> & {
  planCancelAt?: Date | null;
};

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

/**
 * Se `planCancelAt` já passou e o status ainda é ACTIVE, grava CANCELLED.
 * Chamar em páginas/APIs de billing para materializar o fim do período.
 */
export async function settleScheduledPlanCancellation(
  organizationId: string,
  now = new Date(),
): Promise<OrgBillingSlice | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      planStatus: true,
      planTier: true,
      trialEndsAt: true,
      planCancelAt: true,
    },
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
        planStatus: "CANCELLED",
        planCancelAt: null,
        asaasSubscriptionId: null,
      },
      select: {
        planStatus: true,
        planTier: true,
        trialEndsAt: true,
        planCancelAt: true,
      },
    });
  }

  return org;
}

/** Pode usar o produto (agenda/admin básico). */
export function hasPlatformAccess(org: OrgBillingSlice, now = new Date()): boolean {
  if (org.planStatus === "ACTIVE") return true;
  if (isTrialActive(org, now)) return true;
  // PAST_DUE: acesso soft (leitura); CANCELLED/trial expirado: acesso soft também na 1ª entrega
  if (org.planStatus === "PAST_DUE") return true;
  return false;
}

/** Features Pro (caixa + clube) — trial full liberado. */
export function hasProFeatures(org: OrgBillingSlice, now = new Date()): boolean {
  if (isTrialActive(org, now)) return true;
  if (org.planStatus === "ACTIVE" && org.planTier === "PRO") return true;
  return false;
}

/** Após trial sem ACTIVE: aviso + bloqueio de features Pro. */
export function needsBillingAttention(
  org: OrgBillingSlice,
  now = new Date(),
): boolean {
  if (isPlanCancelScheduled(org, now)) return false;
  if (org.planStatus === "ACTIVE") return false;
  if (isTrialActive(org, now)) return false;
  return true;
}

export function planStatusLabel(status: OrganizationPlanStatus): string {
  switch (status) {
    case "TRIAL":
      return "Trial";
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
      return "Trial (acesso completo)";
    case "STARTER":
      return "Starter";
    case "PRO":
      return "Pro";
    default: {
      const _exhaustive: never = tier;
      return _exhaustive;
    }
  }
}
