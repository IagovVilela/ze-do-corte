import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminPanelNav } from "@/components/admin-panel-nav";
import { BillingAttentionBanner } from "@/components/billing-attention-banner";
import { SiteFooter } from "@/components/site-footer";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { needsBillingAttention } from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";

export default async function AdminPanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const access = await getStaffAccessOrNull();
  if (!access) {
    redirect("/admin/login");
  }

  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
    select: { planStatus: true, planTier: true, trialEndsAt: true },
  });

  return (
    <div className="min-h-svh bg-[#0f1419] text-zinc-100">
      <AdminPanelNav access={access} />
      <div className="flex min-h-svh flex-col lg:pl-60">
        {org && needsBillingAttention(org) && access.role === "OWNER" ? (
          <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-3 sm:px-6">
            <BillingAttentionBanner />
          </div>
        ) : null}
        <div className="flex-1 px-4 sm:px-6">{children}</div>
        <SiteFooter showPitch={false} />
      </div>
    </div>
  );
}
