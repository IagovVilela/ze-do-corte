import { AdminPageHeader } from "@/components/admin-page-header";
import { AnimatedSection } from "@/components/animated-section";
import { FinanceSettingsPanel } from "@/components/finance-settings-panel";
import { requireProFinanceAccess } from "@/lib/finance-access";

export const dynamic = "force-dynamic";

export default async function FinanceConfigPage() {
  await requireProFinanceAccess();

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Financeiro · gerencial"
            title="Configuração financeira"
            description="Pró-labore, horas produtivas, margens padrão e classificação de despesas fixas/variáveis para DRE e precificação."
          />
          <div className="mt-8">
            <FinanceSettingsPanel />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
