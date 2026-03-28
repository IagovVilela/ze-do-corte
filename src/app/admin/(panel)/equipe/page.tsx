import { redirect } from "next/navigation";

import { AdminStaffManager } from "@/components/admin-staff-manager";
import { AnimatedSection } from "@/components/animated-section";
import { SectionTitle } from "@/components/section-title";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminEquipePage() {
  const access = await getStaffAccessOrNull();
  if (!access || access.permissions.manageStaff === "none") {
    redirect("/admin");
  }

  const [staff, units] = await Promise.all([
    prisma.staffMember.findMany({
      include: { unit: true },
      orderBy: [{ role: "asc" }, { email: "asc" }],
    }),
    prisma.barbershopUnit.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const staffRows = staff.map((s) => ({
    id: s.id,
    email: s.email,
    displayName: s.displayName,
    role: s.role,
    unitId: s.unitId,
    unitName: s.unit?.name ?? null,
    hasPassword: Boolean(s.passwordHash),
    websiteBio: s.websiteBio,
    showOnWebsite: s.showOnWebsite,
  }));

  const unitOptions = units.map((u) => ({ id: u.id, name: u.name }));

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <SectionTitle
            eyebrow="Acesso"
            title="Equipe do painel"
            subtitle="Cada membro precisa de e-mail e senha para entrar em /admin/login. Para barbeiros: foto em Meu perfil; texto e visibilidade na home em Página inicial abaixo."
          />
          <div className="mt-8">
            <AdminStaffManager
              initialStaff={staffRows}
              units={unitOptions}
              canAssignAdmins={access.permissions.manageStaff === "full"}
            />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
