import { AdminPageHeader } from "@/components/admin-page-header";
import { AnimatedSection } from "@/components/animated-section";
import { FinanceCashflowPanel } from "@/components/finance-cashflow-panel";
import { requireProFinanceAccess } from "@/lib/finance-access";
import { listFinanceUnitsForOrg } from "@/lib/admin-finance-units";

export const dynamic = "force-dynamic";

export default async function FinanceCashflowPage() {
  const access = await requireProFinanceAccess();
  const units = await listFinanceUnitsForOrg(access.organizationId);

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Financeiro · gerencial"
            title="Fluxo de caixa"
            description="Entradas e saídas realizadas e projetadas, com saldo acumulado e visão por categoria."
          />
          <div className="mt-8">
            <FinanceCashflowPanel units={units} />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
