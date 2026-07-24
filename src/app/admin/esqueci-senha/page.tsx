import { Geist, Montserrat } from "next/font/google";
import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { getStaffAccessOrNull } from "@/lib/admin-auth";

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

export const metadata = {
  title: "Esqueci minha senha | Barbernegon",
  description: "Receba um link para redefinir a senha do painel.",
};

export default async function EsqueciSenhaPage() {
  let access: Awaited<ReturnType<typeof getStaffAccessOrNull>> = null;
  try {
    access = await getStaffAccessOrNull();
  } catch (error) {
    console.error("[admin/esqueci-senha] sessão indisponível:", error);
  }

  if (access) {
    redirect("/admin");
  }

  return (
    <ForgotPasswordForm
      className={`${body.variable} ${headline.variable} font-[family-name:var(--font-auth-body)]`}
    />
  );
}
