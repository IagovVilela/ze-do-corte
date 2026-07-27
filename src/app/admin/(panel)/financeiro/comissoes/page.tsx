import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminFinanceCommissionsPanel } from "@/components/admin-finance-commissions-panel";
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
            description="Calcule avulso, assinatura (pote), produtos, bônus e vales por profissional — e gere contas a pagar. Filtre por filial quando houver mais de uma."
          />
          <div className="mt-8">
            <AdminFinanceCommissionsPanel units={units} />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
