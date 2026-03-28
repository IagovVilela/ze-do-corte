import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin-login-form";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { getStaffAccessOrNull } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ from?: string }> };

export default async function AdminLoginPage({ searchParams }: Props) {
  const access = await getStaffAccessOrNull();
  if (access) {
    redirect("/admin");
  }

  const { from } = await searchParams;
  const safeFrom =
    from && from.startsWith("/") && !from.startsWith("//") ? from : "/admin";

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="container-max flex min-h-[60vh] flex-col items-center justify-center py-16">
          <AdminLoginForm redirectTo={safeFrom} />
        </div>
      </main>
      <SiteFooter showPitch={false} />
    </>
  );
}
