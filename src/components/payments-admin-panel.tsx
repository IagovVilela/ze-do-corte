"use client";

import { FormEvent, useEffect, useState } from "react";

type PlatformInfo = {
  encryptionConfigured: boolean;
  webhookTokenConfigured?: boolean;
  readyForShops?: boolean;
  webhookUrl: string | null;
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
      if (!res.ok) throw new Error(data.message ?? "Não foi possível salvar.");
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

  const linked = Boolean(connection?.hasApiKey);
  const receiving = linked && enabled;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="rounded-2xl border border-brand-500/25 bg-brand-500/5 p-5 text-sm leading-relaxed text-zinc-300">
        <h2 className="font-display text-lg text-white">Como o dinheiro chega na sua conta</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            Você cria uma conta grátis no{" "}
            <a
              href="https://www.asaas.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-300 underline-offset-2 hover:underline"
            >
              Asaas
            </a>{" "}
            (é o parceiro que gera o PIX automático — como um “caixa digital” da
            barbearia).
          </li>
          <li>
            No Asaas, cadastre <strong className="font-medium text-zinc-100">sua conta bancária</strong>{" "}
            (conta corrente do CPF/CNPJ da barbearia). É lá que o Asaas envia o
            dinheiro quando você pedir o saque / transferência.
          </li>
          <li>
            Cole abaixo o <strong className="font-medium text-zinc-100">código de conexão</strong>{" "}
            do Asaas. A Barbernegon liga o PIX do site e do clube — o valor cai na{" "}
            <em>sua</em> conta Asaas, não na nossa.
          </li>
        </ol>
        <p className="mt-3 text-xs text-zinc-500">
          Por que não dá só para colar a chave PIX do banco? Porque o site precisa
          gerar um PIX novo a cada cliente (com valor e prazo certos) e avisar
          automaticamente quando pagou. Banco pessoal não oferece isso; o Asaas
          faz esse papel e depois transfere para a sua conta.
        </p>
      </section>

      <div
        className={
          receiving
            ? "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
            : "rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400"
        }
      >
        {receiving
          ? "Recebimento online ligado. Clientes podem pagar PIX no agendamento e no clube."
          : linked
            ? "Código salvo — ative “Quero receber online” e salve para liberar o PIX."
            : "Ainda sem conta ligada. Siga os 3 passos abaixo."}
      </div>

      {!platform?.readyForShops ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          A plataforma ainda está preparando os recebimentos. Se não conseguir
          salvar, fale com o suporte Barbernegon.
        </p>
      ) : null}

      <form onSubmit={onSave} className="space-y-5 rounded-2xl border border-white/10 p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Passo 1
          </p>
          <h3 className="mt-1 text-base font-semibold text-white">
            Crie sua conta no Asaas
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Use o CPF ou CNPJ da barbearia. Depois, no menu do Asaas, vá em{" "}
            <strong className="font-medium text-zinc-200">conta bancária</strong> e
            informe o banco onde você quer receber.
          </p>
          <a
            href="https://www.asaas.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-100 hover:bg-white/5"
          >
            Abrir site do Asaas
          </a>
        </div>

        <div className="border-t border-white/10 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Passo 2
          </p>
          <h3 className="mt-1 text-base font-semibold text-white">
            Copie o código de conexão
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            No Asaas: <strong className="font-medium text-zinc-200">Integrações</strong>{" "}
            → <strong className="font-medium text-zinc-200">API Key</strong> → gerar /
            copiar. Parece uma senha longa (começa com{" "}
            <code className="text-zinc-300">$aact_</code>).
          </p>
          <label className="mt-3 block space-y-1.5 text-sm">
            <span className="text-zinc-300">Cole o código aqui</span>
            <input
              className={inputClass}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                connection?.hasApiKey
                  ? "Já está salvo — cole outro só se quiser trocar"
                  : "Cole o código completo do Asaas"
              }
              autoComplete="off"
            />
          </label>
          <label className="mt-3 block space-y-1.5 text-sm">
            <span className="text-zinc-400">Seu e-mail no Asaas (opcional)</span>
            <input
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex.: barberia@gmail.com"
            />
          </label>
        </div>

        <div className="border-t border-white/10 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Passo 3
          </p>
          <h3 className="mt-1 text-base font-semibold text-white">Ative o recebimento</h3>
          <label className="mt-3 flex items-start gap-3 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="mt-0.5 size-4 rounded border-white/20 bg-zinc-950"
            />
            <span>
              Quero receber online (PIX no agendamento e assinaturas do clube)
            </span>
          </label>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-400">{message}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar e ligar pagamentos"}
        </button>
        <p className="text-xs text-zinc-500">
          Ao salvar, o sistema configura sozinho o aviso de “pagamento confirmado”.
          Você não precisa mexer em webhook nem em códigos técnicos.
        </p>
      </form>

      {events.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-200">Últimos pagamentos avisados</h3>
          <ul className="space-y-2 text-xs text-zinc-500">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="rounded-xl border border-white/5 px-3 py-2"
              >
                {ev.event.replace(/_/g, " ")} ·{" "}
                {new Date(ev.processedAt).toLocaleString("pt-BR")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
