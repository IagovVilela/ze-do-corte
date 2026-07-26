import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PlatformLoginForm } from "@/components/plataforma/platform-login-form";
import {
  extractOpsGateFromSearchParams,
  getPlatformAccessOrNull,
  isValidPlatformOpsGate,
  PLATFORM_OPS_GATE_COOKIE,
  redirectIfPlatformSession,
} from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Entrada secreta do Ops.
 * Use `/plataforma/login?k=PLATFORM_OPS_GATE` — `?ready=1` sozinho é link antigo e não autentica.
 */
export default async function PlataformaLoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  const k = extractOpsGateFromSearchParams(sp);
  const erro = firstParam(sp.erro);
  const ready = firstParam(sp.ready);

  const jar = await cookies();
  const cookieGate = jar.get(PLATFORM_OPS_GATE_COOKIE)?.value ?? null;

  const gate =
    (k && isValidPlatformOpsGate(k) ? k : null) ??
    (isValidPlatformOpsGate(cookieGate) ? cookieGate : null);

  if (!gate) {
    if (ready === "1" || ready === "true") {
      return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-[#0f1419] px-4 py-16 text-zinc-100">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-[#161b22] p-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
              Barbernegon Ops
            </p>
            <h1 className="text-xl font-semibold text-white">Link antigo</h1>
            <p className="text-sm text-zinc-400">
              A URL com <span className="font-mono text-zinc-200">?ready=1</span>{" "}
              não funciona mais. Abra o link completo com{" "}
              <span className="font-mono text-zinc-200">?k=…</span> (o mesmo valor
              de <span className="font-mono text-zinc-200">PLATFORM_OPS_GATE</span>{" "}
              no <span className="font-mono text-zinc-200">.env</span>).
            </p>
            <p className="break-all rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 font-mono text-xs text-brand-200">
              /plataforma/login?k=SEU_PLATFORM_OPS_GATE
            </p>
          </div>
        </div>
      );
    }
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
      <PlatformLoginForm initialError={initialError} opsGate={gate} />
    </div>
  );
}
