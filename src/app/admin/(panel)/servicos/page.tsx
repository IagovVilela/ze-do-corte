import { redirect } from "next/navigation";

import { AdminServicesManager } from "@/components/admin-services-manager";
import { AnimatedSection } from "@/components/animated-section";
import { AdminPageHeader } from "@/components/admin-page-header";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { serviceScopeWhere, unitScopeWhere } from "@/lib/staff-access";

export const dynamic = "force-dynamic";

export default async function AdminServicosPage() {
  const access = await getStaffAccessOrNull();
  if (!access?.permissions.manageServices) {
    redirect("/admin");
  }

  const [services, units] = await Promise.all([
    prisma.service.findMany({
      where: serviceScopeWhere(access),
      orderBy: [{ unit: { name: "asc" } }, { name: "asc" }],
      include: {
        unit: { select: { id: true, name: true } },
        unitOverrides: true,
      },
    }),
    prisma.barbershopUnit.findMany({
      where: unitScopeWhere(access),
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: { id: true, name: true, isDefault: true, isActive: true },
    }),
  ]);

  const rows = services.map((s) => ({
    id: s.id,
    unitId: s.unitId,
    unitName: s.unit.name,
    name: s.name,
    description: s.description,
    category: s.category,
    durationMinutes: s.durationMinutes,
    price: Number(s.price),
    isActive: s.isActive,
    unitOverrides: s.unitOverrides.map(o => ({
      unitId: o.unitId,
      price: o.price ? Number(o.price) : null,
      durationMinutes: o.durationMinutes,
      isActive: o.isActive,
    })),
  }));

  const initialUnits = units.map((u) => ({
    id: u.id,
    name: u.name,
    isDefault: u.isDefault,
    isActive: u.isActive,
  }));

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader
            eyebrow="Catálogo"
            title="Serviços e preços"
            subtitle="Cada serviço pertence a uma unidade (preço e catálogo podem diferir por loja). Filtre por tipo ou unidade, edite ou exclua (se não houver reservas). Alterações ativas refletem no site e no agendamento."
          />
          <div className="mt-8">
            <AdminServicesManager initialServices={rows} initialUnits={initialUnits} />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
