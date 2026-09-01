import "server-only";

import { redirect } from "next/navigation";

import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { hasProFeatures } from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";

export async function requireFinanceRevenueAccess() {
  const access = await getStaffAccessOrNull();
  if (!access) redirect("/admin/login");
  if (!access.permissions.viewRevenue) redirect("/admin");
  return access;
}

export async function requireProFinanceAccess() {
  const access = await requireFinanceRevenueAccess();
  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
    select: { planStatus: true, planTier: true, trialEndsAt: true },
  });
  if (!org || !hasProFeatures(org)) {
    redirect("/admin/plano");
  }
  return access;
}
