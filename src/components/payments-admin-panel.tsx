"use client";

import { FormEvent, useEffect, useState } from "react";

type PlatformInfo = {
  encryptionConfigured: boolean;
  webhookHint: string;
};

type Connection = {
  asaasEnabled: boolean;
  asaasAccountEmail: string | null;
  hasApiKey: boolean;
};

type EventRow = {
  id: string;
  event: string;
  paymentId: string | null;
  externalReference: string | null;
  processedAt: string;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand-500/60";

export function PaymentsAdminPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [apiKey, setApiKey] = useState("");
  const [email, setEmail] = useState("");
  const [enabled, setEnabled] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/payments");
      const data = (await res.json()) as {
        message?: string;
        platform?: PlatformInfo;
        connection?: Connection;
        recentEvents?: EventRow[];
      };
      if (!res.ok) throw new Error(data.message ?? "Falha ao carregar.");
      setPlatform(data.platform ?? null);
      setConnection(data.connection ?? null);
      setEvents(data.recentEvents ?? []);
      setEmail(data.connection?.asaasAccountEmail ?? "");
      setEnabled(data.connection?.asaasEnabled ?? false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asaasEnabled: enabled,
          asaasAccountEmail: email.trim() || null,
          ...(apiKey.trim() ? { asaasApiKey: apiKey.trim() } : {}),
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        connection?: Connection;
      };
      if (!res.ok) throw new Error(data.message ?? "Falha ao salvar.");
      setMessage(data.message ?? "Salvo.");
      setConnection(data.connection ?? null);
      setApiKey("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Carregando…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
        <p>
          Criptografia da API key:{" "}
          <span className="text-zinc-200">
            {platform?.encryptionConfigured ? "OK" : "faltando ASAAS_TOKEN_ENCRYPTION_KEY"}
          </span>
        </p>
        <p className="mt-2">
          Webhook no painel Asaas do salão:{" "}
          <code className="text-xs text-zinc-300">{platform?.webhookHint}</code>
        </p>
        <p className="mt-2 text-xs">
          O dinheiro dos clientes cai na sua conta Asaas. Barbernegon não retém comissão
          nesta etapa.
        </p>
      </div>

      <form onSubmit={onSave} className="space-y-4 rounded-2xl border border-white/10 p-6">
        <label className="flex items-center gap-3 text-sm text-zinc-200">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="size-4 rounded border-white/20 bg-zinc-950"
          />
          Receber online (PIX / clube)
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="text-zinc-400">E-mail da conta Asaas (opcional)</span>
          <input
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="financeiro@minhabarber.com"
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="text-zinc-400">
            API key Asaas{" "}
            {connection?.hasApiKey ? "(já salva — deixe em branco para manter)" : ""}
          </span>
          <input
            className={inputClass}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="$aact_…"
            autoComplete="off"
          />
        </label>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-400">{message}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </form>

      {events.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-200">Eventos recentes</h3>
          <ul className="space-y-2 text-xs text-zinc-500">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="rounded-xl border border-white/5 px-3 py-2 font-mono"
              >
                {ev.event} · {ev.externalReference ?? "—"} ·{" "}
                {new Date(ev.processedAt).toLocaleString("pt-BR")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
