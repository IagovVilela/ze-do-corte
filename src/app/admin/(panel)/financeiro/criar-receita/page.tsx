import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminFinanceEntryForm } from "@/components/admin-finance-entry-form";
import { AnimatedSection } from "@/components/animated-section";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCriarReceitaPage() {
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
            title="Criar receita"
            description="Lançamentos manuais de entrada (além do caixa de atendimentos)."
          />
          <div className="mt-8">
            <AdminFinanceEntryForm kind="INCOME" units={units} />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
