"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import { formatWhatsAppDisplayInput } from "@/lib/phone-to-whatsapp-link";
import {
  formatWhatsAppLogPhone,
  whatsappLogErrorFriendly,
  whatsappLogKindLabel,
  whatsappLogStatusInfo,
} from "@/lib/whatsapp-log-labels";

type PlatformInfo = {
  webhookConfigured: boolean;
  encryptionConfigured: boolean;
  templateConfirmation?: string | null;
  templateReminder?: string | null;
  templateReminderNear?: string | null;
  templateWinback?: string | null;
};

type Connection = {
  whatsappBotEnabled: boolean;
  whatsappConfirmBooking: boolean;
  whatsappReminder24h: boolean;
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

function CheckItem({
  ok,
  label,
  hint,
}: {
  ok: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span
        className={
          ok
            ? "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-300"
            : "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--bn-hover)] text-xs text-[var(--bn-muted)]"
        }
        aria-hidden
      >
        {ok ? "✓" : "·"}
      </span>
      <span>
        <span className="text-[var(--bn-on-variant)]">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-xs text-[var(--bn-muted)]">
            {hint}
          </span>
        ) : null}
      </span>
    </li>
  );
}

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
  const [confirmBooking, setConfirmBooking] = useState(true);
  const [reminder24h, setReminder24h] = useState(true);

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
      setConfirmBooking(data.connection?.whatsappConfirmBooking ?? true);
      setReminder24h(data.connection?.whatsappReminder24h ?? true);
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
          whatsappConfirmBooking: confirmBooking,
          whatsappReminder24h: reminder24h,
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

  const connected =
    Boolean(connection?.hasAccessToken) &&
    Boolean(connection?.whatsappPhoneNumberId);
  const botReady = connected && botEnabled;

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
            isso, use só o número; em{" "}
            <Link
              href="/admin/suporte#contato"
              className="text-[var(--bn-primary)] hover:underline"
            >
              Suporte
            </Link>{" "}
            a Barbernegon pode ajudar a ligar o assistente depois.
          </li>
          <li>
            Informativo em PDF:{" "}
            <a
              href="/informativos/whatsapp-plus.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--bn-primary)] hover:underline"
            >
              Como funciona o WhatsApp inteligente (Plus+)
            </a>
            . Lista completa em{" "}
            <Link href="/admin/condicoes" className="text-[var(--bn-primary)] hover:underline">
              Condições
            </Link>
            .
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 p-5">
        <h2 className="font-display text-lg text-[var(--bn-on)]">Checklist</h2>
        <ul className="mt-3 space-y-2">
          <CheckItem
            ok={connected}
            label="WhatsApp da barbearia conectado"
            hint={
              connected
                ? "Conta ligada e pronta para enviar"
                : "Preencha as opções do assistente abaixo"
            }
          />
          <CheckItem
            ok={botReady}
            label="Assistente ligado"
            hint="Responde e agenda automaticamente no chat"
          />
          <CheckItem
            ok={botReady && confirmBooking}
            label="Comanda no WhatsApp"
            hint="Ao agendar: envia detalhes e link para o cliente gerenciar"
          />
          <CheckItem
            ok={botReady && reminder24h}
            label="Lembretes automáticos"
            hint="Avisa o cliente cerca de 1 dia e cerca de 2 horas antes"
          />
          <CheckItem
            ok={Boolean(platform?.templateConfirmation)}
            label="Aviso de confirmação liberado"
            hint={
              platform?.templateConfirmation
                ? "Pode avisar o cliente mesmo se ele ainda não tiver falado no WhatsApp"
                : "Ainda não liberado — a confirmação só chega se o cliente já falou com a barbearia no WhatsApp"
            }
          />
          <CheckItem
            ok={Boolean(platform?.templateReminder)}
            label="Aviso de lembrete liberado"
            hint={
              platform?.templateReminder
                ? "Lembretes podem sair mesmo sem conversa recente"
                : "Ainda não liberado — lembretes podem falhar se o cliente não falou recentemente"
            }
          />
        </ul>
        {!platform?.templateConfirmation ? (
          <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            <strong className="font-medium text-[var(--bn-on)]">Importante:</strong>{" "}
            o WhatsApp só deixa a barbearia{" "}
            <strong className="font-medium text-[var(--bn-on)]">iniciar</strong>{" "}
            conversa com modelos de mensagem aprovados. Sem isso, o cliente precisa
            mandar um “oi” antes (ou responder alguma mensagem). Se quiser liberar
            confirmação e lembretes automaticamente, fale com o{" "}
            <Link
              href="/admin/suporte#contato"
              className="font-medium text-[var(--bn-on)] underline"
            >
              suporte
            </Link>
            .
          </p>
        ) : null}
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
                abra um chamado em{" "}
                <Link
                  href="/admin/suporte#contato"
                  className="text-[var(--bn-primary)] hover:underline"
                >
                  Suporte
                </Link>{" "}
                — não invente esses valores.
              </p>

              {!platform?.webhookConfigured || !platform?.encryptionConfigured ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-[var(--bn-status-warn)]">
                  A plataforma ainda está preparando o assistente. Fale conosco em{" "}
                  <Link
                    href="/admin/suporte#contato"
                    className="font-semibold underline"
                  >
                    Suporte
                  </Link>{" "}
                  antes de preencher os códigos.
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

              <label className="flex items-center gap-2 text-sm text-[var(--bn-on-variant)]">
                <input
                  type="checkbox"
                  checked={confirmBooking}
                  onChange={(e) => setConfirmBooking(e.target.checked)}
                />
                Enviar comanda no WhatsApp ao agendar (detalhes + link para gerenciar)
              </label>

              <label className="flex items-center gap-2 text-sm text-[var(--bn-on-variant)]">
                <input
                  type="checkbox"
                  checked={reminder24h}
                  onChange={(e) => setReminder24h(e.target.checked)}
                />
                Enviar lembretes automáticos (cerca de 1 dia e 2 horas antes)
              </label>

              <label className="block space-y-1.5 text-sm">
                <span className="text-[var(--bn-on-variant)]">Código do número</span>
                <input
                  className={inputClass}
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="Código longo do número da barbearia"
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="text-[var(--bn-on-variant)]">Chave de acesso</span>
                <input
                  type="password"
                  className={inputClass}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={
                    connection?.hasAccessToken
                      ? "Já salva — cole outra só se for trocar"
                      : "Cole a chave gerada no painel do WhatsApp"
                  }
                  autoComplete="off"
                />
                <span className="block text-xs text-[var(--bn-muted)]">
                  Na dúvida, peça ao suporte para ajudar a colar esses códigos.
                </span>
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
        <p className="mt-1 text-xs text-[var(--bn-muted)]">
          Histórico em linguagem simples. Se algo falhar, mostramos o que fazer.
        </p>
        {logs.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--bn-muted)]">Nenhum envio ainda.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {logs.map((l) => {
              const statusInfo = whatsappLogStatusInfo(l.status);
              const friendlyError = whatsappLogErrorFriendly(l.errorMessage);
              const statusClass =
                statusInfo.tone === "ok"
                  ? "text-emerald-600"
                  : statusInfo.tone === "error"
                    ? "text-rose-700"
                    : statusInfo.tone === "warn"
                      ? "text-amber-700"
                      : "text-[var(--bn-muted)]";
              return (
                <li
                  key={l.id}
                  className="rounded-lg border border-[var(--bn-border)] bg-[var(--bn-hover)] px-3 py-2.5 text-sm"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-medium text-[var(--bn-on)]">
                      {whatsappLogKindLabel(l.kind)}
                    </span>
                    <span className={statusClass}>· {statusInfo.label}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--bn-muted)]">
                    Para {formatWhatsAppLogPhone(l.waUserPhone)} ·{" "}
                    {new Date(l.createdAt).toLocaleString("pt-BR")}
                  </p>
                  {friendlyError ? (
                    <div className="mt-2 rounded-md border border-rose-500/25 bg-rose-500/10 px-2.5 py-2 text-xs text-rose-800 dark:text-rose-200">
                      <p className="font-medium">{friendlyError.title}</p>
                      {friendlyError.howToFix ? (
                        <p className="mt-1 opacity-90">{friendlyError.howToFix}</p>
                      ) : null}
                    </div>
                  ) : statusInfo.hint && statusInfo.tone === "ok" ? (
                    <p className="mt-1.5 text-xs text-[var(--bn-muted)]">
                      {statusInfo.hint}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
