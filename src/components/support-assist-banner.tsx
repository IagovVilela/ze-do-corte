"use client";

import { useState } from "react";

type Props = {
  shopName: string;
};

export function SupportAssistBanner({ shopName }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function returnToConsole() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/consultores/assist/return", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        message?: string;
        redirect?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "Não foi possível voltar ao console.");
        return;
      }
      window.location.href = data.redirect || "/consultores";
    } catch {
      setError("Erro de rede. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-3 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-amber-50">
          Modo assistência em{" "}
          <span className="font-semibold">{shopName}</span> — sem dados
          financeiros, chaves ou edição.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => void returnToConsole()}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-amber-300 px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-amber-200 disabled:opacity-60"
        >
          {pending ? "Voltando…" : "Voltar ao console"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-200">{error}</p> : null}
    </div>
  );
}
