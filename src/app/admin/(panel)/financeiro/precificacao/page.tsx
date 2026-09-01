import { AdminPageHeader } from "@/components/admin-page-header";
import { AnimatedSection } from "@/components/animated-section";
import { ServicePricingPanel } from "@/components/service-pricing-panel";
import { requireProFinanceAccess } from "@/lib/finance-access";
import { listFinanceUnitsForOrg } from "@/lib/admin-finance-units";

export const dynamic = "force-dynamic";

export default async function FinancePricingPage() {
  const access = await requireProFinanceAccess();
  const units = await listFinanceUnitsForOrg(access.organizationId);

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Financeiro · gerencial"
            title="Precificação (CSV / PV)"
            description="Custo do serviço vendido e preço de venda sugerido com base em mão de obra, materiais e rateio de despesas fixas."
          />
          <div className="mt-8">
            <ServicePricingPanel units={units} />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
