"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  organizationId: string;
  initial: {
    planStatus: string;
    planTier: string;
    trialEndsAt: string | null;
    marketplaceListed: boolean;
  };
};

export function PlatformOrgEditor({ organizationId, initial }: Props) {
  const router = useRouter();
  const [planStatus, setPlanStatus] = useState(initial.planStatus);
  const [planTier, setPlanTier] = useState(initial.planTier);
  const [trialEndsAt, setTrialEndsAt] = useState(
    initial.trialEndsAt
      ? initial.trialEndsAt.slice(0, 10)
      : "",
  );
  const [marketplaceListed, setMarketplaceListed] = useState(
    initial.marketplaceListed,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/plataforma/organizations/${organizationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planStatus,
            planTier,
            marketplaceListed,
            trialEndsAt: trialEndsAt
              ? new Date(`${trialEndsAt}T23:59:59.000Z`).toISOString()
              : null,
          }),
        },
      );
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Falha ao salvar.");
      setMessage("Atualizado.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100";

  return (
    <div className="space-y-4 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-200">
        Gerir plano e listagem
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-zinc-400">
          Status do plano
          <select
            className={field}
            value={planStatus}
            onChange={(e) => setPlanStatus(e.target.value)}
          >
            <option value="TRIAL">Trial</option>
            <option value="ACTIVE">Ativo</option>
            <option value="PAST_DUE">Pagamento pendente</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          Tier
          <select
            className={field}
            value={planTier}
            onChange={(e) => setPlanTier(e.target.value)}
          >
            <option value="TRIAL_FULL">Trial full</option>
            <option value="STARTER">Starter</option>
            <option value="PRO">Pro</option>
          </select>
        </label>
        <label className="text-xs text-zinc-400">
          Fim do trial
          <input
            type="date"
            className={field}
            value={trialEndsAt}
            onChange={(e) => setTrialEndsAt(e.target.value)}
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm text-zinc-200">
          <input
            type="checkbox"
            checked={marketplaceListed}
            onChange={(e) => setMarketplaceListed(e.target.checked)}
            className="size-4 rounded border-white/20"
          />
          Aparecer no marketplace (/explorar)
        </label>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => void onSave()}
        className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
      >
        {saving ? "Salvando…" : "Salvar alterações"}
      </button>
      {message ? (
        <p className="text-sm text-emerald-300">{message}</p>
      ) : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
