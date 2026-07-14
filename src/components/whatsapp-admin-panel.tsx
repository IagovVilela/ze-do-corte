"use client";

import { FormEvent, useEffect, useState } from "react";

type PlatformInfo = {
  webhookConfigured: boolean;
  encryptionConfigured: boolean;
  appId: string | null;
  graphVersion: string;
  templateConfirmation: string | null;
  templateReminder: string | null;
};

type Connection = {
  whatsappBotEnabled: boolean;
  whatsappPhoneNumberId: string | null;
  whatsappWabaId: string | null;
  whatsappDisplayPhone: string | null;
  whatsappConnectedAt: string | null;
  hasAccessToken: boolean;
};

type LogRow = {
  id: string;
  kind: string;
  status: string;
  waUserPhone: string;
  errorMessage: string | null;
  createdAt: string;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand-500/60";

export function WhatsAppAdminPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [botEnabled, setBotEnabled] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/whatsapp");
      const data = (await res.json()) as {
        message?: string;
        platform?: PlatformInfo;
        connection?: Connection;
        logs?: LogRow[];
      };
      if (!res.ok) throw new Error(data.message ?? "Falha ao carregar.");
      setPlatform(data.platform ?? null);
      setConnection(data.connection ?? null);
      setLogs(data.logs ?? []);
      setPhoneNumberId(data.connection?.whatsappPhoneNumberId ?? "");
      setWabaId(data.connection?.whatsappWabaId ?? "");
      setDisplayPhone(data.connection?.whatsappDisplayPhone ?? "");
      setBotEnabled(data.connection?.whatsappBotEnabled ?? false);
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
      const res = await fetch("/api/admin/whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappBotEnabled: botEnabled,
          whatsappPhoneNumberId: phoneNumberId.trim() || null,
          whatsappWabaId: wabaId.trim() || null,
          whatsappDisplayPhone: displayPhone.trim() || null,
          ...(accessToken.trim()
            ? { whatsappAccessToken: accessToken.trim() }
            : {}),
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        connection?: Connection;
      };
      if (!res.ok) throw new Error(data.message ?? "Falha ao salvar.");
      setConnection(data.connection ?? null);
      setAccessToken("");
      setMessage("Configuração WhatsApp salva.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setSaving(false);
    }
  }

  async function onDisconnect() {
    if (!window.confirm("Desconectar o número WhatsApp desta barbearia?")) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disconnect: true }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? "Falha.");
      setMessage("WhatsApp desconectado.");
      setAccessToken("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Carregando WhatsApp…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {(message || error) && (
        <p
          className={
            error
              ? "rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
              : "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
          }
        >
          {error || message}
        </p>
      )}

      <section className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/40 p-5 text-sm">
        <h2 className="font-display text-lg text-white">Plataforma Meta</h2>
        <ul className="space-y-1 text-zinc-400">
          <li>
            Webhook / App Secret:{" "}
            <span className="text-zinc-200">
              {platform?.webhookConfigured ? "OK" : "faltando META_*"}
            </span>
          </li>
          <li>
            Criptografia de token:{" "}
            <span className="text-zinc-200">
              {platform?.encryptionConfigured
                ? "OK"
                : "faltando WHATSAPP_TOKEN_ENCRYPTION_KEY"}
            </span>
          </li>
          <li>
            Template confirmação:{" "}
            <span className="text-zinc-200">
              {platform?.templateConfirmation ?? "— (usa texto na janela 24h)"}
            </span>
          </li>
          <li>
            Template lembrete:{" "}
            <span className="text-zinc-200">
              {platform?.templateReminder ?? "—"}
            </span>
          </li>
        </ul>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Webhook público:{" "}
          <code className="text-zinc-400">/api/webhooks/whatsapp</code>. Cada
          barbearia usa o próprio <em>Phone number ID</em>; o bot resolve a org
          por esse ID.
        </p>
      </section>

      <form onSubmit={onSave} className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg text-white">Conexão desta barbearia</h2>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={botEnabled}
              onChange={(e) => setBotEnabled(e.target.checked)}
            />
            Bot ativo
          </label>
        </div>

        <p className="text-xs text-zinc-500">
          Status:{" "}
          {connection?.hasAccessToken
            ? `token gravado${connection.whatsappConnectedAt ? ` · ${new Date(connection.whatsappConnectedAt).toLocaleString("pt-BR")}` : ""}`
            : "sem token"}
        </p>

        <label className="block space-y-1.5 text-sm">
          <span className="text-zinc-300">Phone number ID (Meta)</span>
          <input
            className={inputClass}
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            placeholder="Ex.: 1098…"
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-zinc-300">WABA ID (opcional)</span>
          <input
            className={inputClass}
            value={wabaId}
            onChange={(e) => setWabaId(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-zinc-300">Número exibido</span>
          <input
            className={inputClass}
            value={displayPhone}
            onChange={(e) => setDisplayPhone(e.target.value)}
            placeholder="+55 11 …"
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-zinc-300">
            Access token {connection?.hasAccessToken ? "(deixe vazio para manter)" : ""}
          </span>
          <input
            type="password"
            className={inputClass}
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="EAAG…"
            autoComplete="off"
          />
        </label>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-brand-400 px-5 py-2 text-sm font-bold text-zinc-950 disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
          <button
            type="button"
            disabled={saving || !connection?.hasAccessToken}
            onClick={() => void onDisconnect()}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-40"
          >
            Desconectar
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-white/10 bg-zinc-950/40 p-5">
        <h2 className="font-display text-lg text-white">Envios recentes</h2>
        {logs.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nenhum envio ainda.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-xs text-zinc-400">
            {logs.map((l) => (
              <li
                key={l.id}
                className="rounded-lg border border-white/5 bg-black/20 px-3 py-2"
              >
                <span className="text-zinc-200">{l.kind}</span> · {l.status} ·{" "}
                {l.waUserPhone} ·{" "}
                {new Date(l.createdAt).toLocaleString("pt-BR")}
                {l.errorMessage ? (
                  <span className="mt-1 block text-rose-300">{l.errorMessage}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
