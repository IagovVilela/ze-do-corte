import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminFinanceEntryForm } from "@/components/admin-finance-entry-form";
import { AnimatedSection } from "@/components/animated-section";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCriarDespesaPage() {
  const access = await getStaffAccessOrNull();
  if (!access) redirect("/admin/login");
  if (!access.permissions.viewRevenue) redirect("/admin");

  const units = await prisma.barbershopUnit.findMany({
    where: { organizationId: access.organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Financeiro"
            title="Criar despesa"
            description="Registre custos do salão (aluguel, fornecedores, utilidades) com vencimento e forma de pagamento."
          />
          <div className="mt-8">
            <AdminFinanceEntryForm kind="EXPENSE" units={units} />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
