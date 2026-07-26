"use client";

import { useState } from "react";

type Props = {
  shopName: string;
};

export function OpsImpersonationBanner({ shopName }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function returnToOps() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/plataforma/impersonate/return", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        message?: string;
        redirect?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "Não foi possível voltar ao Ops.");
        return;
      }
      window.location.href = data.redirect || "/plataforma/barbearias";
    } catch {
      setError("Erro de rede. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border-b border-sky-500/30 bg-sky-500/10 px-4 py-3 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-sky-100">
          Você está no painel de{" "}
          <span className="font-semibold">{shopName}</span> como suporte Ops.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => void returnToOps()}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-sky-400 px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-sky-300 disabled:opacity-60"
        >
          {pending ? "Voltando…" : "Voltar ao Ops"}
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-rose-200">{error}</p>
      ) : null}
    </div>
  );
}
