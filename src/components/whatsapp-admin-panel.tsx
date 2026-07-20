"use client";

import { FormEvent, useEffect, useState } from "react";

import { formatWhatsAppDisplayInput } from "@/lib/phone-to-whatsapp-link";

type PlatformInfo = {
  webhookConfigured: boolean;
  encryptionConfigured: boolean;
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
  "w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-4 py-2.5 text-sm text-[var(--bn-on)] outline-none focus:border-brand-500/60";

export function WhatsAppAdminPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      setDisplayPhone(
        formatWhatsAppDisplayInput(
          data.connection?.whatsappDisplayPhone ?? "",
        ),
      );
      setBotEnabled(data.connection?.whatsappBotEnabled ?? false);
      if (
        data.connection?.whatsappPhoneNumberId ||
        data.connection?.hasAccessToken
      ) {
        setShowAdvanced(true);
      }
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
          whatsappDisplayPhone: displayPhone.trim() || null,
          ...(showAdvanced
            ? {
                whatsappPhoneNumberId: phoneNumberId.trim() || null,
                whatsappWabaId: wabaId.trim() || null,
                ...(accessToken.trim()
                  ? { whatsappAccessToken: accessToken.trim() }
                  : {}),
              }
            : {}),
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        connection?: Connection;
      };
      if (!res.ok) throw new Error(data.message ?? "Não foi possível salvar.");
      setConnection(data.connection ?? null);
      setAccessToken("");
      setMessage(
        data.message ??
          "Número salvo. O botão de WhatsApp do site já pode usar esse contato.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setSaving(false);
    }
  }

  async function onDisconnect() {
    if (
      !window.confirm(
        "Desligar o assistente de mensagens? Seu número no site continua cadastrado.",
      )
    ) {
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
      setMessage(data.message ?? "Assistente desligado.");
      setAccessToken("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--bn-muted)]">Carregando WhatsApp…</p>;
  }

  const botReady =
    Boolean(connection?.hasAccessToken) &&
    Boolean(connection?.whatsappPhoneNumberId) &&
    botEnabled;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {(message || error) && (
        <p
          className={
            error
              ? "rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-[var(--bn-status-danger)]"
              : "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-[var(--bn-status-ok)]"
          }
        >
          {error || message}
        </p>
      )}

      <section className="rounded-2xl border border-brand-500/25 bg-brand-500/5 p-5 text-sm leading-relaxed text-[var(--bn-on-variant)]">
        <h2 className="font-display text-lg text-[var(--bn-on)]">O que você precisa saber</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-[var(--bn-on)]">Número da barbearia</strong> —
            é o que você já usa no dia a dia. Serve para o botão “WhatsApp” do site.
          </li>
          <li>
            <strong className="font-medium text-[var(--bn-on)]">Assistente que agenda sozinho</strong>{" "}
            — precisa de WhatsApp Business oficial (Meta). Se você ainda não tem
            isso, use só o número; o suporte Barbernegon pode ajudar a ligar o
            assistente depois.
          </li>
        </ul>
      </section>

      <div
        className={
          botReady
            ? "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-[var(--bn-status-ok)]"
            : "rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-hover)] px-4 py-3 text-sm text-[var(--bn-muted)]"
        }
      >
        {botReady
          ? "Assistente ligado — clientes podem agendar pelo WhatsApp."
          : connection?.whatsappDisplayPhone
            ? "Número no site: ok. Assistente de agenda ainda não está ligado."
            : "Cadastre o número da barbearia para aparecer no site."}
      </div>

      <form onSubmit={onSave} className="space-y-5 rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--bn-muted)]">
            Passo 1 — o essencial
          </p>
          <label className="mt-2 block space-y-1.5 text-sm">
            <span className="text-[var(--bn-on-variant)]">Número de WhatsApp da barbearia</span>
            <input
              className={inputClass}
              type="tel"
              inputMode="tel"
              value={displayPhone}
              onChange={(e) =>
                setDisplayPhone(formatWhatsAppDisplayInput(e.target.value))
              }
              placeholder="(11) 99999-0000 ou +15551540355"
              autoComplete="tel"
            />
            <span className="block text-xs text-[var(--bn-muted)]">
              Brasil: digite com DDD. Número de teste da Meta: comece com +
              (ex. +15551540355).
            </span>
          </label>
        </div>

        <div className="border-t border-[var(--bn-border)] pt-5">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-left text-sm text-[var(--bn-primary)] hover:underline"
          >
            {showAdvanced
              ? "Ocultar opções do assistente"
              : "Quero ligar o assistente que agenda pelo WhatsApp"}
          </button>

          {showAdvanced ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[var(--bn-muted)]">
                Esses códigos vêm do painel WhatsApp Business (Meta). Na dúvida,
                peça ao suporte Barbernegon — não invente esses valores.
              </p>

              {!platform?.webhookConfigured || !platform?.encryptionConfigured ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-[var(--bn-status-warn)]">
                  A plataforma ainda está preparando o assistente. Fale com o
                  suporte antes de preencher os códigos.
                </p>
              ) : null}

              <label className="flex items-center gap-2 text-sm text-[var(--bn-on-variant)]">
                <input
                  type="checkbox"
                  checked={botEnabled}
                  onChange={(e) => setBotEnabled(e.target.checked)}
                />
                Ligar assistente (responder e agendar automaticamente)
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="text-[var(--bn-on-variant)]">Código do número (Phone number ID)</span>
                <input
                  className={inputClass}
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="Número longo que a Meta mostra"
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="text-[var(--bn-on-variant)]">Senha de acesso (Access token)</span>
                <input
                  type="password"
                  className={inputClass}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={
                    connection?.hasAccessToken
                      ? "Já salva — cole outra só se for trocar"
                      : "Cole a senha longa que a Meta gerou"
                  }
                  autoComplete="off"
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="text-[var(--bn-muted)]">ID da conta Business (opcional)</span>
                <input
                  className={inputClass}
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                />
              </label>
            </div>
          ) : null}
        </div>

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
            className="rounded-full border border-[var(--bn-border)] px-4 py-2 text-sm text-[var(--bn-on-variant)] hover:bg-[var(--bn-hover)] disabled:opacity-40"
          >
            Desligar assistente
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 p-5">
        <h2 className="font-display text-lg text-[var(--bn-on)]">Mensagens recentes</h2>
        {logs.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--bn-muted)]">Nenhum envio ainda.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-xs text-[var(--bn-muted)]">
            {logs.map((l) => (
              <li
                key={l.id}
                className="rounded-lg border border-[var(--bn-border)] bg-[var(--bn-hover)] px-3 py-2"
              >
                <span className="text-[var(--bn-on-variant)]">{l.kind}</span> · {l.status} ·{" "}
                {l.waUserPhone} ·{" "}
                {new Date(l.createdAt).toLocaleString("pt-BR")}
                {l.errorMessage ? (
                  <span className="mt-1 block text-rose-700">{l.errorMessage}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
