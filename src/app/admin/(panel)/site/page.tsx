import { redirect } from "next/navigation";

import { AdminPageHeader } from "@/components/admin-page-header";
import { SiteCanvasEditor } from "@/components/site-canvas/site-canvas-editor";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import {
  getPublicBarbers,
  getPublicBarbershopUnits,
  getServices,
} from "@/lib/data";
import { orgDisplaySlogan } from "@/lib/org-branding";
import { prisma } from "@/lib/prisma";
import type { OrganizationPublic } from "@/lib/organization";
import { orgSelect } from "@/lib/organization";

export const dynamic = "force-dynamic";

export default async function AdminSitePage() {
  const access = await getStaffAccessOrNull();
  if (!access) return null;
  if (!access.permissions.manageBranding) {
    redirect("/admin");
  }

  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
    select: { ...orgSelect, onboardingJson: true },
  });
  if (!org) redirect("/admin");

  const [services, barbers, units] = await Promise.all([
    getServices(org.id),
    getPublicBarbers(org.id),
    getPublicBarbershopUnits(org.id),
  ]);

  const slogans = orgDisplaySlogan(org);
  const flags =
    org.onboardingJson &&
    typeof org.onboardingJson === "object" &&
    !Array.isArray(org.onboardingJson)
      ? (org.onboardingJson as Record<string, unknown>)
      : {};
  const canvasStudioSeen = flags.canvasStudioSeen === true;

  const { onboardingJson: _omit, ...publicOrg } = org;

  return (
    <div className="max-lg:-mx-4 max-lg:space-y-0 sm:max-lg:-mx-6 lg:space-y-4">
      <div className="max-lg:hidden">
        <AdminPageHeader
          eyebrow="Site"
          title="Monte o site da sua barbearia"
          description={
            <>
              Arraste, edite textos e fotos. Desktop e celular são telas
              separadas. Logo, slug e redes ficam em{" "}
              <a
                href="/admin/marca"
                className="text-[var(--bn-primary)] underline-offset-2 hover:underline"
              >
                Marca
              </a>
              .
            </>
          }
        />
      </div>
      <SiteCanvasEditor
        initialOrg={publicOrg as OrganizationPublic}
        services={services}
        barbers={barbers}
        units={units}
        slogans={slogans}
        initialCanvasStudioSeen={canvasStudioSeen}
      />
    </div>
  );
}
