import { redirect } from "next/navigation";

import { ClubAdminPanel } from "@/components/club-admin-panel";
import { SectionTitle } from "@/components/section-title";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { serviceScopeWhere } from "@/lib/staff-access";

export const dynamic = "force-dynamic";

export default async function AdminClubePage() {
  const access = await getStaffAccessOrNull();
  if (!access) return null;
  if (!access.permissions.manageSubscriptions) redirect("/admin");

  const services = await prisma.service.findMany({
    where: { isActive: true, ...serviceScopeWhere(access) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Clube"
        title="Assinaturas da casa"
        description="Planos simples, vínculo por telefone e cancelamento imediato — sem burocracia."
      />
      <ClubAdminPanel services={services} />
    </div>
  );
}
