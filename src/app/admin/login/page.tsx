import { Geist, Montserrat } from "next/font/google";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin-login-form";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { isPlatformAdminEmail } from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

const body = Geist({
  subsets: ["latin"],
  variable: "--font-auth-body",
  display: "swap",
});

const headline = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-auth-headline",
  display: "swap",
});

type Props = { searchParams: Promise<{ from?: string; reset?: string }> };

function safeRedirectPath(from: string | undefined): string {
  if (from && from.startsWith("/") && !from.startsWith("//")) return from;
  return "/admin";
}

export const metadata = {
  title: "Entrar no painel | Barbernegon",
  description: "Acesse o painel da sua barbearia na Barbernegon.",
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const { from, reset } = await searchParams;
  const safeFrom = safeRedirectPath(from);
  const passwordResetOk = reset === "1";

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
    <AdminLoginForm
      redirectTo={safeFrom}
      passwordResetOk={passwordResetOk}
      className={`${body.variable} ${headline.variable} font-[family-name:var(--font-auth-body)]`}
    />
  );
}
