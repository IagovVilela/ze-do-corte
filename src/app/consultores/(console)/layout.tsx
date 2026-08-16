import type { ReactNode } from "react";

import { ConsultantSidebar } from "@/components/consultores/consultant-sidebar";
import { requireConsultantPageAccess } from "@/lib/consultant-auth";

export default async function ConsultoresLayout({
  children,
}: {
  children: ReactNode;
}) {
  const access = await requireConsultantPageAccess();

  return (
    <div className="min-h-svh bg-[#0f1419] text-zinc-100">
      <ConsultantSidebar
        email={access.email}
        displayName={access.displayName}
      />
      <div className="lg:pl-60">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
