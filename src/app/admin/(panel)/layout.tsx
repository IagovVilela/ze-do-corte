import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminPanelNav } from "@/components/admin-panel-nav";
import { BillingAttentionBanner } from "@/components/billing-attention-banner";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { needsBillingAttention } from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const access = await getStaffAccessOrNull();
  if (!access) {
    redirect("/admin/login");
  }

  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
    select: { planStatus: true, planTier: true, trialEndsAt: true },
  });

  return (
    <>
      <Navbar />
      <div className="container-max pt-20 sm:pt-24">
        <AdminPanelNav access={access} />
        {org && needsBillingAttention(org) && access.role === "OWNER" ? (
          <div className="mt-4">
            <BillingAttentionBanner />
          </div>
        ) : null}
      </div>
      {children}
      <SiteFooter showPitch={false} />
    </>
  );
}
