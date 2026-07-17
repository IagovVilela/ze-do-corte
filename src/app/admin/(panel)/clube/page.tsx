import { redirect } from "next/navigation";

import { ClubAdminPanel } from "@/components/club-admin-panel";
import { SectionTitle } from "@/components/section-title";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { hasProFeatures } from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";
import { serviceScopeWhere } from "@/lib/staff-access";

export const dynamic = "force-dynamic";

export default async function AdminClubePage() {
  const access = await getStaffAccessOrNull();
  if (!access) return null;
  if (!access.permissions.manageSubscriptions) redirect("/admin");

  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
    select: {
      slug: true,
      planStatus: true,
      planTier: true,
      trialEndsAt: true,
    },
  });
  if (!org || !hasProFeatures(org)) {
    redirect("/admin/plano");
  }

  const services = await prisma.service.findMany({
    where: { isActive: true, ...serviceScopeWhere(access) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8 py-6">
      <SectionTitle
        eyebrow="Clube"
        title="Assinaturas da casa"
        description="Crie planos, compartilhe o link público e receba o PIX na sua Asaas. O crédito entra no agendamento pelo telefone."
      />
      <ClubAdminPanel services={services} orgSlug={org.slug} />
    </div>
  );
}
