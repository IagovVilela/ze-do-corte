import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { PlatformLoginForm } from "@/components/plataforma/platform-login-form";
import {
  getPlatformAccessOrNull,
  isValidPlatformOpsGate,
  PLATFORM_OPS_GATE_COOKIE,
  redirectIfPlatformSession,
} from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ k?: string; erro?: string }> };

/**
 * Entrada secreta do Ops.
 * Primeiro acesso: `/plataforma/login?k=CHAVE` → grava cookie httpOnly e tira `k` da URL.
 * Depois: só cookie (sem segredo na barra de endereço / histórico).
 */
export default async function PlataformaLoginPage({ searchParams }: Props) {
  const { k, erro } = await searchParams;
  const jar = await cookies();
  const fromCookie = jar.get(PLATFORM_OPS_GATE_COOKIE)?.value;

  if (k && isValidPlatformOpsGate(k)) {
    jar.set(PLATFORM_OPS_GATE_COOKIE, k, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/plataforma",
      maxAge: 60 * 60 * 8,
    });
    redirect(erro ? `/plataforma/login?erro=${encodeURIComponent(erro)}` : "/plataforma/login");
  }

  const gate = fromCookie ?? null;
  if (!isValidPlatformOpsGate(gate)) {
    notFound();
  }

  let access = null;
  try {
    access = await getPlatformAccessOrNull();
  } catch {
    /* DB offline — ainda mostra formulário */
  }
  redirectIfPlatformSession(access);

  const initialError =
    erro === "sem-permissao"
      ? "Sua conta não tem acesso ao Barbernegon Ops."
      : null;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#0f1419] px-4 py-16 text-zinc-100">
      <PlatformLoginForm initialError={initialError} />
    </div>
  );
}
