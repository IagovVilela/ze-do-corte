import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminPanelNav } from "@/components/admin-panel-nav";
import { BillingAttentionBanner } from "@/components/billing-attention-banner";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { hasProFeatures, needsBillingAttention } from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";

function AdminProductFooter() {
  return (
    <footer className="mt-auto border-t border-[#2F3336] px-4 py-4 sm:px-6">
      <p className="text-center text-xs text-[#9CA3AF] sm:text-left">
        Barbernegon · Painel · © {new Date().getFullYear()}
      </p>
    </footer>
  );
}

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

  const proUnlocked = org ? hasProFeatures(org) : false;

  return (
    <div className="min-h-svh bg-[#0f1419] text-zinc-100">
      <AdminPanelNav access={access} proUnlocked={proUnlocked} />
      <div className="flex min-h-svh flex-col lg:pl-60">
        {org && needsBillingAttention(org) && access.role === "OWNER" ? (
          <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-3 sm:px-6">
            <BillingAttentionBanner />
          </div>
        ) : null}
        <div className="flex-1 px-4 sm:px-6">{children}</div>
        <AdminProductFooter />
      </div>
    </div>
  );
}
