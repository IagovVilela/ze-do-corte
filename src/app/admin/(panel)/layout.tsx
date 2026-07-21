import { cookies } from "next/headers";
import { Montserrat } from "next/font/google";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminPanelNav } from "@/components/admin-panel-nav";
import { AdminThemeProvider } from "@/components/admin-theme-provider";
import { BillingAttentionBanner } from "@/components/billing-attention-banner";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import {
  ADMIN_THEME_COOKIE,
  parseAdminTheme,
  type AdminTheme,
} from "@/lib/admin-theme";
import {
  hasProFeatures,
  isFreePlanUpsell,
  needsBillingAttention,
  settleOrgBillingState,
} from "@/lib/org-entitlements";
import { prisma } from "@/lib/prisma";

const brandHeadline = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-brand-headline",
  display: "swap",
});

function AdminProductFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--bn-border)] px-4 py-4 sm:px-6">
      <p className="text-center text-xs text-[var(--bn-muted)] sm:text-left">
        Barbernegon · Painel · © {new Date().getFullYear()}
      </p>
    </footer>
  );
}

async function readAdminThemeFromCookie(): Promise<AdminTheme> {
  const jar = await cookies();
  return parseAdminTheme(jar.get(ADMIN_THEME_COOKIE)?.value);
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

  await settleOrgBillingState(access.organizationId);

  const [org, initialTheme] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: access.organizationId },
      select: {
        planStatus: true,
        planTier: true,
        trialEndsAt: true,
        planCancelAt: true,
      },
    }),
    readAdminThemeFromCookie(),
  ]);

  const proUnlocked = org ? hasProFeatures(org) : false;
  const freeUpsell = org ? isFreePlanUpsell(org) : false;

  return (
    <AdminThemeProvider initialTheme={initialTheme}>
      <div
        data-admin-theme-root
        data-theme={initialTheme}
        className={`brand-onyx min-h-svh bg-[var(--bn-bg)] text-[var(--bn-on)] ${brandHeadline.variable}`}
      >
        {/* Tema via cookie SSR; sem <script> (React 19 não executa no client boundary). */}
        <AdminPanelNav access={access} proUnlocked={proUnlocked} />
        <div className="flex min-h-svh flex-col lg:pl-60">
          {org && needsBillingAttention(org) && access.role === "OWNER" ? (
            <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-3 sm:px-6">
              <BillingAttentionBanner freeUpsell={freeUpsell} />
            </div>
          ) : null}
          <div className="flex-1 px-4 py-6 sm:px-6">{children}</div>
          <AdminProductFooter />
        </div>
      </div>
    </AdminThemeProvider>
  );
}
