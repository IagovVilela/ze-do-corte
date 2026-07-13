"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PlatformUpgradeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onClick() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/platform/billing", { method: "POST" });
      const data = (await res.json()) as { message?: string };
      setMessage(data.message ?? (res.ok ? "Ok." : "Falha."));
      if (res.ok) router.refresh();
    } catch {
      setMessage("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={loading}
        className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-60"
      >
        {loading ? "Registrando…" : "Solicitar upgrade (stub)"}
      </button>
      {message ? <p className="text-xs text-zinc-500">{message}</p> : null}
    </div>
  );
}
