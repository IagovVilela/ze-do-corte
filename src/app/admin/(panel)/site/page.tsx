import { redirect } from "next/navigation";

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
    select: orgSelect,
  });
  if (!org) redirect("/admin");

  const [services, barbers, units] = await Promise.all([
    getServices(org.id),
    getPublicBarbers(org.id),
    getPublicBarbershopUnits(org.id),
  ]);

  const slogans = orgDisplaySlogan(org);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
          Site
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide text-white">
          Canvas da página
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Monte a página no canvas: arraste, redimensione e edite. Desktop e
          mobile são layouts separados. Identidade (logo, slug, redes) fica em{" "}
          <a href="/admin/marca" className="text-brand-200 underline-offset-2 hover:underline">
            Marca
          </a>
          .
        </p>
      </div>
      <SiteCanvasEditor
        initialOrg={org as OrganizationPublic}
        services={services}
        barbers={barbers}
        units={units}
        slogans={slogans}
      />
    </div>
  );
}
