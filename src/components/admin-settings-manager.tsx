"use client";

import { useState } from "react";

type Preset = { key: string; label: string; hint: string; value: string };

type Props = { presets: Preset[] };

export function AdminSettingsManager({ presets: initial }: Props) {
  const [presets, setPresets] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const settings = Object.fromEntries(
        presets.map((p) => [p.key, p.value]),
      );
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(payload.message ?? "Erro ao guardar.");
      setMessage("Configuração guardada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setPending(false);
    }
  }

  const ta =
    "mt-1 w-full min-h-[100px] rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/60";

  return (
    <form onSubmit={save} className="glass-card space-y-6 rounded-2xl p-6">
      {message ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {presets.map((p, i) => (
        <label key={p.key} className="block text-sm">
          <span className="font-medium text-zinc-200">{p.label}</span>
          <p className="text-xs text-zinc-500">{p.hint}</p>
          <textarea
            className={ta}
            value={p.value}
            onChange={(e) => {
              const v = e.target.value;
              setPresets((prev) =>
                prev.map((row, j) => (j === i ? { ...row, value: v } : row)),
              );
            }}
          />
        </label>
      ))}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50"
      >
        Guardar tudo
      </button>
    </form>
  );
}
