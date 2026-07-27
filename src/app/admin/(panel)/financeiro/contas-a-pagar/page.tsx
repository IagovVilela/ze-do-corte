import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminFinanceEntriesList } from "@/components/admin-finance-entries-list";
import { AnimatedSection } from "@/components/animated-section";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { listFinanceUnitsForOrg } from "@/lib/admin-finance-units";

export const dynamic = "force-dynamic";

export default async function AdminContasAPagarPage() {
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
            title="Contas a pagar"
            description="Despesas em aberto — quite ou cancele conforme o fluxo de caixa. Filtre por filial quando houver mais de uma."
          />
          <div className="mt-8">
            <AdminFinanceEntriesList
              kind="EXPENSE"
              status="OPEN"
              createHref="/admin/financeiro/criar-despesa"
              createLabel="Criar despesa"
              units={units}
            />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
