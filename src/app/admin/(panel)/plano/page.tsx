import Link from "next/link";

import { BillingAttentionBanner } from "@/components/billing-attention-banner";
import { PlatformCancelPlanButton } from "@/components/platform-cancel-plan-button";
import { PlatformUpgradeButton } from "@/components/platform-upgrade-button";
import { SaasPlanComparison } from "@/components/saas-plan-comparison";
import { AdminPageHeader } from "@/components/admin-page-header";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import type { SaasPlanId } from "@/lib/asaas-plans";
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
  const trialActive = isTrialActive(org);
  const proUnlocked = hasProFeatures(org);
  const currentPlanId: SaasPlanId | null =
    org.planStatus === "ACTIVE" &&
    (org.planTier === "STARTER" || org.planTier === "PRO")
      ? org.planTier === "PRO"
        ? "pro"
        : "starter"
      : null;

  return (
    <div className="space-y-8 py-6">
      <AdminPageHeader
        eyebrow="Plataforma"
        title="Seu plano Barbernegon"
        description="Assinatura da plataforma (site + painel). Separada do PIX e do clube dos seus clientes."
      />

      {needsBillingAttention(org) ? <BillingAttentionBanner /> : null}

      <div className="max-w-3xl space-y-4 rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-hover)] p-6">
        <p className="text-sm text-[var(--bn-muted)]">
          Organização: <span className="text-[var(--bn-on)]">{org.name}</span>
          {" · "}
          <Link href={`/${org.slug}`} className="text-[var(--bn-primary)] hover:underline">
            /{org.slug}
          </Link>
        </p>
        <p className="font-display text-3xl text-[var(--bn-on)]">
          {planStatusLabel(org.planStatus)}
          {cancelScheduled ? (
            <span className="ml-2 text-base font-sans font-normal text-[var(--bn-status-warn)]/90">
              · cancela em {org.planCancelAt!.toLocaleDateString("pt-BR")}
            </span>
          ) : null}
        </p>
        <p className="text-sm text-[var(--bn-muted)]">
          Plano: {planTierLabel(org.planTier)}
        </p>
        {org.planStatus === "TRIAL" && trialActive && trialLeft != null ? (
          <p className="text-sm text-[var(--bn-status-ok)]/90">
            Trial: {trialLeft} dia(s) restantes
            {org.trialEndsAt
              ? ` · até ${org.trialEndsAt.toLocaleDateString("pt-BR")}`
              : ""}{" "}
            — Caixa e Clube liberados.
          </p>
        ) : null}

        <div
          className={
            proUnlocked
              ? "rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-[var(--bn-status-ok)]"
              : "rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-[var(--bn-status-warn)]"
          }
        >
          {proUnlocked ? (
            <p>
              <span className="font-semibold">Caixa e Clube liberados</span> —
              você pode usar relatório financeiro e assinaturas dos clientes.
            </p>
          ) : (
            <p>
              <span className="font-semibold">Caixa e Clube bloqueados</span> —
              no Starter (ou sem assinatura ativa) esses menus redirecionam para
              esta página. Assine o <strong>Pro</strong> para liberar.
            </p>
          )}
        </div>
      </div>

      <div className="max-w-4xl space-y-4">
        <h2 className="text-lg font-semibold text-[var(--bn-on)]">Compare e escolha</h2>
        <SaasPlanComparison
          currentPlanId={currentPlanId}
          trialActive={trialActive}
          showCta={false}
        />
      </div>

      <div className="max-w-xl space-y-4 rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-hover)] p-6">
        <p className="text-sm font-medium text-[var(--bn-on-variant)]">Assinar agora</p>
        <p className="text-xs text-[var(--bn-muted)]">
          Escolha PIX (paga a fatura todo mês) ou cartão (cadastre uma vez na
          fatura Asaas; cobrança mensal automática). Após o pagamento o status
          muda para Ativo e as funções do plano passam a valer.
        </p>
        {!cancelScheduled ? <PlatformUpgradeButton /> : null}

        <PlatformCancelPlanButton
          planStatus={org.planStatus}
          planCancelAt={org.planCancelAt?.toISOString() ?? null}
        />
      </div>
    </div>
  );
}
