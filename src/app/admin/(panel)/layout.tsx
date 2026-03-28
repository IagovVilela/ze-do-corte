import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminPanelNav } from "@/components/admin-panel-nav";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { getStaffAccessOrNull } from "@/lib/admin-auth";

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const access = await getStaffAccessOrNull();
  if (!access) {
    redirect("/admin/login");
  }

  return (
    <>
      <Navbar />
      <div className="container-max pt-4">
        <AdminPanelNav access={access} />
      </div>
      {children}
      <SiteFooter showPitch={false} />
    </>
  );
}
