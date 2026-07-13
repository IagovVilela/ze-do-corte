import Link from "next/link";
import { redirect } from "next/navigation";

import { PlatformUpgradeButton } from "@/components/platform-upgrade-button";
import { SectionTitle } from "@/components/section-title";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PLAN_LABEL: Record<string, string> = {
  TRIAL: "Trial",
  ACTIVE: "Ativo",
  PAST_DUE: "Pagamento pendente",
  CANCELLED: "Cancelado",
};

export default async function AdminPlanoPage() {
  const access = await getStaffAccessOrNull();
  if (!access) return null;
  if (access.role !== "OWNER") redirect("/admin");

  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
    select: {
      name: true,
      slug: true,
      planStatus: true,
      trialEndsAt: true,
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

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Plataforma"
        title="Seu plano Barbernegon"
        description="Billing da plataforma (assinatura do dono) — separado do clube de clientes."
      />

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
          {PLAN_LABEL[org.planStatus] ?? org.planStatus}
        </p>
        {org.planStatus === "TRIAL" && trialLeft != null ? (
          <p className="text-sm text-zinc-400">
            Trial: {trialLeft} dia(s) restantes
            {org.trialEndsAt
              ? ` · até ${org.trialEndsAt.toLocaleDateString("pt-BR")}`
              : ""}
          </p>
        ) : null}

        <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
          <p className="text-sm font-medium text-zinc-200">Planos (em breve gateway)</p>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex justify-between rounded-xl border border-white/10 px-4 py-3">
              <span>Starter — site + agenda + admin</span>
              <span className="text-zinc-200">{formatMoney(79)}/mês</span>
            </li>
            <li className="flex justify-between rounded-xl border border-brand-500/30 bg-brand-500/5 px-4 py-3">
              <span>Pro — + caixa + clube</span>
              <span className="text-brand-100">{formatMoney(129)}/mês</span>
            </li>
          </ul>
          <p className="text-xs text-zinc-500">
            Stub de billing: integração Asaas/Stripe na próxima etapa. Enquanto isso, o trial
            libera o produto completo.
          </p>
          <PlatformUpgradeButton />
        </div>
      </div>
    </div>
  );
}
