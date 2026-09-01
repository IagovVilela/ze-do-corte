import { AdminPageHeader } from "@/components/admin-page-header";
import { AnimatedSection } from "@/components/animated-section";
import { FinanceDrePanel } from "@/components/finance-dre-panel";
import { requireProFinanceAccess } from "@/lib/finance-access";

export const dynamic = "force-dynamic";

export default async function FinanceDrePage() {
  await requireProFinanceAccess();

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Financeiro · gerencial"
            title="DRE gerencial"
            description="Demonstrativo de resultados mensal: receitas, CSV, despesas fixas, pró-labore e comissões."
          />
          <div className="mt-8">
            <FinanceDrePanel />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
