import { redirect } from "next/navigation";

import { AdminUnitsManager } from "@/components/admin-units-manager";
import { AnimatedSection } from "@/components/animated-section";
import { SectionTitle } from "@/components/section-title";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminUnitsPage() {
  const access = await getStaffAccessOrNull();
  if (!access?.permissions.manageUnits) {
    redirect("/admin");
  }

  const units = await prisma.barbershopUnit.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  const serialized = units.map((u) => ({
    id: u.id,
    name: u.name,
    slug: u.slug,
    city: u.city,
    addressLine: u.addressLine,
    phone: u.phone,
    isActive: u.isActive,
    isDefault: u.isDefault,
  }));

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <SectionTitle
            eyebrow="Operação"
            title="Unidades da barbearia"
            subtitle="Cada unidade tem sua agenda. O site público agenda na unidade definida como padrão. O proprietário pode editar dados cadastrais (nome, slug, endereço, telefone) em Editar dados."
          />
          <div className="mt-8">
            <AdminUnitsManager
              initialUnits={serialized}
              canDeleteUnits={access.role === "OWNER"}
              canEditUnitDetails={access.role === "OWNER"}
            />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
