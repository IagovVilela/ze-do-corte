import { AdminPageHeader } from "@/components/admin-page-header";
import { AnimatedSection } from "@/components/animated-section";
import { BreakEvenPanel } from "@/components/break-even-panel";
import { requireProFinanceAccess } from "@/lib/finance-access";

export const dynamic = "force-dynamic";

export default async function FinanceBreakEvenPage() {
  await requireProFinanceAccess();

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Financeiro · gerencial"
            title="Ponto de equilíbrio"
            description="Quantos atendimentos você precisa realizar para cobrir custos fixos e pró-labore no mês."
          />
          <div className="mt-8">
            <BreakEvenPanel />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
