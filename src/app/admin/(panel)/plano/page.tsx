import Link from "next/link";

import { BillingAttentionBanner } from "@/components/billing-attention-banner";
import { PlatformCancelPlanButton } from "@/components/platform-cancel-plan-button";
import { PlatformUpgradeButton } from "@/components/platform-upgrade-button";
import { SectionTitle } from "@/components/section-title";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { SAAS_PLANS } from "@/lib/asaas-plans";
import {
  isPlanCancelScheduled,
  isTrialActive,
  needsBillingAttention,
  planStatusLabel,
  planTierLabel,
  settleScheduledPlanCancellation,
} from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPlanoPage() {
  const access = await getStaffAccessOrNull();
  if (!access) return null;
  if (access.role !== "OWNER") redirect("/admin");

  await settleScheduledPlanCancellation(access.organizationId);

  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
    select: {
      name: true,
      slug: true,
      planStatus: true,
      planTier: true,
      trialEndsAt: true,
      planCancelAt: true,
    },
  });
  if (!org) redirect("/admin");

  const trialLeft =
    org.trialEndsAt != null
      ? Math.max(
          0,
          Math.ceil(
            (org.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          ),
        )
      : null;

  const cancelScheduled = isPlanCancelScheduled(org);

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Plataforma"
        title="Seu plano Barbernegon"
        description="Assinatura do dono na plataforma — separada do clube de clientes e dos PIX do salão."
      />

      {needsBillingAttention(org) ? <BillingAttentionBanner /> : null}

      <div className="max-w-xl space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-sm text-zinc-400">
          Organização: <span className="text-zinc-100">{org.name}</span>
        </p>
        <p className="text-sm text-zinc-400">
          Site:{" "}
          <Link href={`/${org.slug}`} className="text-brand-200 hover:underline">
            /{org.slug}
          </Link>
        </p>
        <p className="font-display text-3xl text-white">
          {planStatusLabel(org.planStatus)}
          {cancelScheduled ? (
            <span className="ml-2 text-base font-sans font-normal text-amber-200/90">
              · cancela em {org.planCancelAt!.toLocaleDateString("pt-BR")}
            </span>
          ) : null}
        </p>
        <p className="text-sm text-zinc-400">
          Tier: {planTierLabel(org.planTier)}
        </p>
        {org.planStatus === "TRIAL" && isTrialActive(org) && trialLeft != null ? (
          <p className="text-sm text-zinc-400">
            Trial: {trialLeft} dia(s) restantes
            {org.trialEndsAt
              ? ` · até ${org.trialEndsAt.toLocaleDateString("pt-BR")}`
              : ""}
          </p>
        ) : null}

        <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
          <p className="text-sm font-medium text-zinc-200">Planos</p>
          <ul className="space-y-2 text-sm text-zinc-400">
            {SAAS_PLANS.map((plan) => (
              <li
                key={plan.id}
                className={
                  plan.id === "pro"
                    ? "flex justify-between rounded-xl border border-brand-500/30 bg-brand-500/5 px-4 py-3"
                    : "flex justify-between rounded-xl border border-white/10 px-4 py-3"
                }
              >
                <span>
                  {plan.name} — {plan.blurb}
                </span>
                <span className="text-zinc-200">
                  {formatMoney(plan.priceMonthly)}/mês
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-500">
            Cobrança via Asaas (PIX recorrente). Após o pagamento o status muda para
            Ativo automaticamente.
          </p>
          {!cancelScheduled ? <PlatformUpgradeButton /> : null}
        </div>

        <PlatformCancelPlanButton
          planStatus={org.planStatus}
          planCancelAt={org.planCancelAt?.toISOString() ?? null}
        />
      </div>
    </div>
  );
}
