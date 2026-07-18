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
  ADMIN_THEME_STORAGE_KEY,
  parseAdminTheme,
  type AdminTheme,
} from "@/lib/admin-theme";
import { hasProFeatures, needsBillingAttention } from "@/lib/org-entitlements";
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

  const [org, initialTheme] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: access.organizationId },
      select: { planStatus: true, planTier: true, trialEndsAt: true },
    }),
    readAdminThemeFromCookie(),
  ]);

  const proUnlocked = org ? hasProFeatures(org) : false;

  return (
    <AdminThemeProvider initialTheme={initialTheme}>
      <div
        data-admin-theme-root
        data-theme={initialTheme}
        className={`brand-onyx min-h-svh bg-[var(--bn-bg)] text-[var(--bn-on)] ${brandHeadline.variable}`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem(${JSON.stringify(ADMIN_THEME_STORAGE_KEY)});if(t==="light"||t==="dark"){var r=document.querySelector("[data-admin-theme-root]");if(r)r.setAttribute("data-theme",t);}}catch(e){}})();`,
          }}
        />
        <AdminPanelNav access={access} proUnlocked={proUnlocked} />
        <div className="flex min-h-svh flex-col lg:pl-60">
          {org && needsBillingAttention(org) && access.role === "OWNER" ? (
            <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-3 sm:px-6">
              <BillingAttentionBanner />
            </div>
          ) : null}
          <div className="flex-1 px-4 py-6 sm:px-6">{children}</div>
          <AdminProductFooter />
        </div>
      </div>
    </AdminThemeProvider>
  );
}
