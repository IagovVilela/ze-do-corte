import { redirect } from "next/navigation";

import { AdminStaffManager } from "@/components/admin-staff-manager";
import { AnimatedSection } from "@/components/animated-section";
import { AdminPageHeader } from "@/components/admin-page-header";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import {
  freeTierAllowsAnotherStaffSeat,
  settleOrgBillingState,
} from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";
import { staffMemberScopeWhere, unitScopeWhere } from "@/lib/staff-access";
import { defaultWorkWeekFromShop, parseWorkWeekFromDb } from "@/lib/work-week";

export const dynamic = "force-dynamic";

export default async function AdminEquipePage() {
  const access = await getStaffAccessOrNull();
  if (!access || access.permissions.manageStaff === "none") {
    redirect("/admin");
  }

  const [staff, units, org] = await Promise.all([
    prisma.staffMember.findMany({
      where: staffMemberScopeWhere(access),
      include: { unit: true },
      orderBy: [{ role: "asc" }, { email: "asc" }],
    }),
    prisma.barbershopUnit.findMany({
      where: { isActive: true, ...unitScopeWhere(access) },
      orderBy: { name: "asc" },
    }),
    settleOrgBillingState(access.organizationId).then(() =>
      prisma.organization.findUnique({
        where: { id: access.organizationId },
        select: {
          planStatus: true,
          planTier: true,
          trialEndsAt: true,
          planCancelAt: true,
        },
      }),
    ),
  ]);

  const staffSeatCount = staff.filter((s) => s.role === "STAFF").length;
  const staffSeatLimitReached = org
    ? !freeTierAllowsAnotherStaffSeat(org, staffSeatCount)
    : false;
  const defaults = defaultWorkWeekFromShop();
  const staffRows = staff.map((s) => {
    const base = {
      id: s.id,
      email: s.email,
      displayName: s.displayName,
      role: s.role,
      unitId: s.unitId,
      unitName: s.unit?.name ?? null,
      hasPassword: Boolean(s.passwordHash),
      websiteBio: s.websiteBio,
      showOnWebsite: s.showOnWebsite,
    };
    if (s.role !== "STAFF") return base;
    const custom = parseWorkWeekFromDb(s.workWeekJson ?? null);
    return {
      ...base,
      workWeekInitialWeek: custom ?? defaults,
      workWeekUsesCustom: custom !== null,
    };
  });

  const unitOptions = units.map((u) => ({ id: u.id, name: u.name }));

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <AdminPageHeader eyebrow="Acesso" title="Equipe do painel" />
          <div className="mt-8">
            <AdminStaffManager
              initialStaff={staffRows}
              units={unitOptions}
              canAssignAdmins={access.permissions.manageStaff === "full"}
              staffSeatLimitReached={staffSeatLimitReached}
            />
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
