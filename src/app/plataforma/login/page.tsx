import { notFound } from "next/navigation";

import { PlatformLoginForm } from "@/components/plataforma/platform-login-form";
import {
  getPlatformAccessOrNull,
  isValidPlatformOpsGate,
  redirectIfPlatformSession,
} from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ k?: string; erro?: string }> };

/**
 * Entrada secreta do Ops. Sem `PLATFORM_OPS_GATE` correto em `?k=`, responde 404.
 * URL: /plataforma/login?k=SUA_CHAVE
 */
export default async function PlataformaLoginPage({ searchParams }: Props) {
  const { k, erro } = await searchParams;

  if (!isValidPlatformOpsGate(k)) {
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
      <PlatformLoginForm gate={k!} initialError={initialError} />
    </div>
  );
}
