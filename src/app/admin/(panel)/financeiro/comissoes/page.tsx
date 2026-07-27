import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminCommissionRulesPanel } from "@/components/admin-commission-rules-panel";
import { AdminFinanceCommissionsPanel } from "@/components/admin-finance-commissions-panel";
import { AdminGoalsPanel } from "@/components/admin-goals-panel";
import { AnimatedSection } from "@/components/animated-section";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { listFinanceUnitsForOrg } from "@/lib/admin-finance-units";

export const dynamic = "force-dynamic";

export default async function AdminComissoesPage() {
  const access = await getStaffAccessOrNull();
  if (!access) redirect("/admin/login");
  if (!access.permissions.viewRevenue) redirect("/admin");

  const units = await listFinanceUnitsForOrg(access.organizationId);

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Financeiro"
            title="Pagamento de comissões"
            description="Calcule avulso, assinatura (pote), produtos, bônus e vales por profissional — e gere contas a pagar. Defina metas mensais e faixas escalonadas abaixo."
          />
          <div className="mt-8">
            <AdminFinanceCommissionsPanel units={units} />
          </div>
          <div className="mt-12 space-y-3">
            <h2 className="font-display text-lg text-[var(--bn-on)]">
              Metas do mês
            </h2>
            <p className="text-sm text-[var(--bn-muted)]">
              Progresso com base em agendamentos pagos no mês.
            </p>
            <AdminGoalsPanel />
          </div>
          <div className="mt-12 space-y-3">
            <h2 className="font-display text-lg text-[var(--bn-on)]">
              Regras e faixas
            </h2>
            <AdminCommissionRulesPanel />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
