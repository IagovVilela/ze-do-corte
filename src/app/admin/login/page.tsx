import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin-login-form";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { isPlatformAdminEmail } from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ from?: string }> };

function safeRedirectPath(from: string | undefined): string {
  if (from && from.startsWith("/") && !from.startsWith("//")) return from;
  return "/admin";
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const { from } = await searchParams;
  const safeFrom = safeRedirectPath(from);

  // Sessão: falha de DB não deve quebrar a tela de login.
  // `redirect()` lança NEXT_REDIRECT — deve ficar fora do try/catch.
  let access: Awaited<ReturnType<typeof getStaffAccessOrNull>> = null;
  try {
    access = await getStaffAccessOrNull();
  } catch (error) {
    console.error("[admin/login] sessão indisponível:", error);
  }

  if (access) {
    if (
      safeFrom.startsWith("/plataforma") &&
      isPlatformAdminEmail(access.email)
    ) {
      redirect(safeFrom);
    }
    redirect("/admin");
  }

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col pt-20 sm:pt-24">
        <div className="container-max flex min-h-[60vh] flex-col items-center justify-center py-16">
          <AdminLoginForm redirectTo={safeFrom} />
        </div>
      </main>
      <SiteFooter showPitch={false} />
    </>
  );
}
