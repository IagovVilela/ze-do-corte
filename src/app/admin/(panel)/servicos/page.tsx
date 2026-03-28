import { redirect } from "next/navigation";

import { AdminServicesManager } from "@/components/admin-services-manager";
import { AnimatedSection } from "@/components/animated-section";
import { SectionTitle } from "@/components/section-title";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminServicosPage() {
  const access = await getStaffAccessOrNull();
  if (!access?.permissions.manageServices) {
    redirect("/admin");
  }

  const services = await prisma.service.findMany({
    orderBy: { name: "asc" },
  });

  const rows = services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    durationMinutes: s.durationMinutes,
    price: Number(s.price),
    isActive: s.isActive,
  }));

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <SectionTitle
            eyebrow="Catálogo"
            title="Serviços e preços"
            subtitle="Crie serviços, filtre por tipo, edite ou exclua (se não houver reservas). Alterações ativas refletem no site e no agendamento."
          />
          <div className="mt-8">
            <AdminServicesManager initialServices={rows} />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
