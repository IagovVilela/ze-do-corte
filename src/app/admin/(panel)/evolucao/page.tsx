import { redirect } from "next/navigation";

import { AdminEvolutionPanel } from "@/components/admin-evolution-panel";
import { AdminPageHeader } from "@/components/admin-page-header";
import { AnimatedSection } from "@/components/animated-section";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { getAdminEvolutionSnapshot } from "@/lib/admin-evolution";
import { prisma } from "@/lib/prisma";
import { unitScopeWhere } from "@/lib/staff-access";

export const dynamic = "force-dynamic";

export default async function AdminEvolucaoPage() {
  const access = await getStaffAccessOrNull();
  if (!access) redirect("/admin/login");
  if (access.role !== "OWNER" && access.role !== "ADMIN") {
    redirect("/admin");
  }

  const [snapshot, units] = await Promise.all([
    getAdminEvolutionSnapshot(access),
    prisma.barbershopUnit.findMany({
      where: { isActive: true, ...unitScopeWhere(access) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Visão geral"
            title="Evolução"
            description="Monitore faturamento, retorno de clientes, volume e crescimento do salão ao longo do tempo."
          />
          <div className="mt-8">
            <AdminEvolutionPanel units={units} initial={snapshot} />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
