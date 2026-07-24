import { Geist, Montserrat } from "next/font/google";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/reset-password-form";
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

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export const metadata = {
  title: "Redefinir senha | Barbernegon",
  description: "Crie uma nova senha para o painel Barbernegon.",
};

export default async function RedefinirSenhaPage({ searchParams }: Props) {
  const { token } = await searchParams;

  let access: Awaited<ReturnType<typeof getStaffAccessOrNull>> = null;
  try {
    access = await getStaffAccessOrNull();
  } catch (error) {
    console.error("[admin/redefinir-senha] sessão indisponível:", error);
  }

  if (access) {
    redirect("/admin");
  }

  return (
    <ResetPasswordForm
      token={typeof token === "string" ? token.trim() : ""}
      className={`${body.variable} ${headline.variable} font-[family-name:var(--font-auth-body)]`}
    />
  );
}
