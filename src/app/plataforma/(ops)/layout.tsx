import type { ReactNode } from "react";

import { PlatformSidebar } from "@/components/plataforma/platform-sidebar";
import { requirePlatformPageAccess } from "@/lib/platform-auth";
import { PLATFORM_SUPPORT_DISPLAY_NAME } from "@/lib/support";

export default async function PlataformaOpsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const access = await requirePlatformPageAccess();

  return (
    <div className="min-h-svh bg-[#0f1419] text-zinc-100">
      <PlatformSidebar
        email={access.email}
        displayName={PLATFORM_SUPPORT_DISPLAY_NAME}
      />
      <div className="lg:pl-60">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
