"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  formatBrMoneyFromNumber,
  formatBrMoneyInput,
  formatBrPhoneNational,
  formatCpfCnpj,
  formatIntegerDigits,
  parseBrMoneyInput,
} from "@/lib/br-input-masks";
import { formatMoney } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  cycleDays: number;
  visitsIncluded: number | null;
  isActive: boolean;
  _count?: { subscriptions: number };
};

type Subscription = {
  id: string;
  clientName: string;
  clientPhone: string;
  status: string;
  currentPeriodEnd: string;
  visitsUsed: number;
  cancelledAt: string | null;
  cancelReason: string | null;
  plan: { id: string; name: string; price: string | number; visitsIncluded: number | null };
};

type ServiceOpt = { id: string; name: string };

type PixPayload = {
  encodedImage?: string | null;
  payload?: string | null;
};

type BookingClient = {
  name: string;
  phone: string;
  email: string | null;
};

async function readJson<T extends Record<string, unknown>>(
  res: Response,
): Promise<T & { message?: string }> {
  const text = await res.text();
  if (!text.trim()) {
    return { message: res.ok ? undefined : "Resposta vazia do servidor." } as T & {
      message?: string;
    };
  }
  try {
    return JSON.parse(text) as T & { message?: string };
  } catch {
    return {
      message: res.ok
        ? "Resposta inválida do servidor."
        : `Erro ${res.status}: resposta inválida.`,
    } as T & { message?: string };
  }
}

export function ClubAdminPanel({
  services,
  orgSlug,
}: {
  services: ServiceOpt[];
  orgSlug: string;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [bookingClients, setBookingClients] = useState<BookingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState(() => formatBrMoneyFromNumber(99));
  const [planCycle, setPlanCycle] = useState("30");
  const [planVisits, setPlanVisits] = useState("");
  const [planServices, setPlanServices] = useState<string[]>([]);

  const [subPlanId, setSubPlanId] = useState("");
  const [pickedClientKey, setPickedClientKey] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCpf, setClientCpf] = useState("");
  const [billingType, setBillingType] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [lastPix, setLastPix] = useState<PixPayload | null>(null);
  const [lastInvoiceUrl, setLastInvoiceUrl] = useState<string | null>(null);
  const [lastBillingType, setLastBillingType] = useState<
    "PIX" | "CREDIT_CARD" | null
  >(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    const [pRes, sRes, cRes] = await Promise.all([
      fetch("/api/admin/subscription-plans"),
      fetch("/api/admin/client-subscriptions"),
      fetch("/api/admin/booking-clients"),
    ]);
    const pData = (await readJson<{ plans?: Plan[]; message?: string }>(pRes));
    const sData = (await readJson<{
      subscriptions?: Subscription[];
      message?: string;
    }>(sRes));
    const cData = (await readJson<{
      clients?: BookingClient[];
      message?: string;
    }>(cRes));
    if (!pRes.ok) throw new Error(pData.message ?? "Falha ao carregar planos.");
    if (!sRes.ok) {
      throw new Error(sData.message ?? "Falha ao carregar assinantes.");
    }
    setPlans(pData.plans ?? []);
    setSubs(sData.subscriptions ?? []);
    if (cRes.ok) {
      setBookingClients(cData.clients ?? []);
    }
    if (!subPlanId && (pData.plans?.length ?? 0) > 0) {
      setSubPlanId(
        pData.plans!.find((p) => p.isActive)?.id ?? pData.plans![0]!.id,
      );
    }
  }

  function pickBookingClient(key: string) {
    setPickedClientKey(key);
    if (!key) return;
    const client = bookingClients.find(
      (c) => `${c.phone}|${c.name}` === key,
    );
    if (!client) return;
    setClientName(client.name);
    setClientPhone(formatBrPhoneNational(client.phone));
  }

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createPlan(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/subscription-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: planName,
        price: parseBrMoneyInput(planPrice),
        cycleDays: Number(planCycle) || 30,
        visitsIncluded: planVisits ? Number(planVisits) : null,
        serviceIds: planServices,
      }),
    });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) {
      setError(data.message ?? "Falha ao criar plano.");
      return;
    }
    setPlanName("");
    setPlanPrice(formatBrMoneyFromNumber(99));
    setPlanCycle("30");
    setPlanVisits("");
    setMessage("Plano criado.");
    await reload();
  }

  async function createSub(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLastPix(null);
    setLastInvoiceUrl(null);
    setLastBillingType(null);
    const cpfDigits = clientCpf.replace(/\D/g, "");
    const res = await fetch("/api/admin/client-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: subPlanId,
        clientName,
        clientPhone,
        clientCpfCnpj: cpfDigits || undefined,
        chargeOnline: cpfDigits.length >= 11 ? true : false,
        billingType: cpfDigits.length >= 11 ? billingType : undefined,
      }),
    });
    const data = (await res.json()) as {
      message?: string;
      pix?: PixPayload | null;
      invoiceUrl?: string | null;
      billingType?: "PIX" | "CREDIT_CARD" | null;
    };
    if (!res.ok) {
      setError(data.message ?? "Falha ao vincular cliente.");
      return;
    }
    setClientName("");
    setClientPhone("");
    setClientCpf("");
    setPickedClientKey("");
    setLastPix(data.pix ?? null);
    setLastInvoiceUrl(data.invoiceUrl ?? null);
    setLastBillingType(data.billingType ?? billingType);
    setMessage(data.message ?? "Cliente adicionado ao clube.");
    await reload();
  }

  async function actOnSub(
    id: string,
    action: "pause" | "resume" | "postpone" | "cancel",
  ) {
    setError("");
    setMessage("");
    setBusyId(id);
    try {
      let body: Record<string, unknown> | undefined;
      if (action === "cancel") {
        const reason = window.prompt(
          "Motivo do cancelamento (opcional). O acesso encerra imediatamente e o cliente é avisado.",
          "Cancelado a pedido do cliente",
        );
        if (reason === null) return;
        body = { reason };
      } else if (action === "pause") {
        const reason = window.prompt(
          "Motivo da pausa (opcional). O cliente fica sem benefício do clube até reativar.",
          "Pausado pelo salão",
        );
        if (reason === null) return;
        body = { reason };
      } else if (action === "postpone") {
        const raw = window.prompt(
          "Postergar por quantos dias? (1 a 90). Atualiza o prazo e a cobrança na Asaas, se houver.",
          "7",
        );
        if (raw === null) return;
        const days = Number(raw.trim());
        if (!Number.isFinite(days) || days < 1 || days > 90) {
          setError("Informe um número de dias entre 1 e 90.");
          return;
        }
        body = { days };
      }

      const res = await fetch(`/api/admin/client-subscriptions/${id}/${action}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Falha na ação.");
        return;
      }
      setMessage(data.message ?? "Atualizado.");
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function copyPublicLink() {
    const url = `${window.location.origin}/${orgSlug}/clube`;
    await navigator.clipboard.writeText(url);
    setMessage("Link do clube copiado.");
  }

  const inputClass =
    "w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-sm text-[var(--bn-on)] outline-none focus:border-brand-500/60";

  if (loading) {
    return <p className="text-sm text-[var(--bn-muted)]">Carregando clube…</p>;
  }

  return (
    <div className="space-y-8">
      {(error || message) && (
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

      <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 px-4 py-4 text-sm">
        <p className="font-semibold text-[var(--bn-primary)]">Link para o cliente assinar</p>
        <p className="mt-1 text-xs text-[var(--bn-primary)]">
          Compartilhe no WhatsApp ou no Instagram. O cliente escolhe o plano, paga o
          PIX e agenda com o mesmo telefone.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="max-w-full truncate rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-xs text-[var(--bn-on-variant)]">
            /{orgSlug}/clube
          </code>
          <button
            type="button"
            onClick={() => void copyPublicLink()}
            className="rounded-full border border-[var(--bn-border)] px-3 py-1.5 text-xs text-[var(--bn-on-variant)] hover:bg-[var(--bn-hover)]"
          >
            Copiar link
          </button>
          <a
            href={`/${orgSlug}/clube`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[var(--bn-border)] px-3 py-1.5 text-xs text-[var(--bn-primary)] hover:bg-[var(--bn-hover)]"
          >
            Abrir página
          </a>
        </div>
      </div>

      <section className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={createPlan} className="space-y-3 rounded-2xl border border-[var(--bn-border)] p-5">
          <h3 className="font-semibold text-[var(--bn-on)]">Novo plano</h3>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--bn-muted)]">
              Nome do plano
            </span>
            <input
              required
              placeholder="Ex.: Corte e barba mensal"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className={inputClass}
            />
          </label>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block min-w-0 space-y-1">
              <span className="text-xs font-medium text-[var(--bn-muted)]">
                Preço (R$)
              </span>
              <input
                required
                inputMode="decimal"
                placeholder="99,00"
                value={planPrice}
                onChange={(e) => setPlanPrice(formatBrMoneyInput(e.target.value))}
                className={`${inputClass} min-w-0`}
              />
            </label>
            <label className="block min-w-0 space-y-1">
              <span className="text-xs font-medium text-[var(--bn-muted)]">
                Ciclo (dias)
              </span>
              <input
                inputMode="numeric"
                placeholder="30"
                value={planCycle}
                onChange={(e) =>
                  setPlanCycle(formatIntegerDigits(e.target.value, 4))
                }
                className={`${inputClass} min-w-0`}
                aria-describedby="plan-cycle-hint"
              />
              <span id="plan-cycle-hint" className="block text-[10px] text-[var(--bn-muted)]">
                A cada quantos dias cobra de novo
              </span>
            </label>
            <label className="block min-w-0 space-y-1">
              <span className="text-xs font-medium text-[var(--bn-muted)]">
                Visitas no ciclo
              </span>
              <input
                inputMode="numeric"
                placeholder="Opcional"
                value={planVisits}
                onChange={(e) =>
                  setPlanVisits(formatIntegerDigits(e.target.value, 4))
                }
                className={`${inputClass} min-w-0`}
                aria-describedby="plan-visits-hint"
              />
              <span
                id="plan-visits-hint"
                className="block text-[10px] text-[var(--bn-muted)]"
              >
                Vazio = ilimitado
              </span>
            </label>
          </div>
          {services.length > 0 ? (
            <fieldset className="space-y-1">
              <legend className="text-xs font-medium text-[var(--bn-muted)]">
                Serviços inclusos
              </legend>
              <p className="text-[10px] text-[var(--bn-muted)]">
                Marque os serviços em que o crédito do clube vale no agendamento.
              </p>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                {services.map((s) => {
                  const checked = planServices.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--bn-border)] px-2.5 py-1 text-xs text-[var(--bn-on-variant)]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setPlanServices((prev) =>
                            checked ? prev.filter((id) => id !== s.id) : [...prev, s.id],
                          )
                        }
                      />
                      {s.name}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
          <button
            type="submit"
            className="rounded-full bg-brand-400 px-4 py-2 text-sm font-bold text-zinc-950"
          >
            Criar plano
          </button>
        </form>

        <form onSubmit={createSub} className="space-y-3 rounded-2xl border border-[var(--bn-border)] p-5">
          <h3 className="font-semibold text-[var(--bn-on)]">Vincular cliente (balcão)</h3>
          <p className="text-xs text-[var(--bn-muted)]">
            Com CPF, gera cobrança na Asaas (PIX ou cartão). Sem CPF, o cliente
            entra ativo sem cobrança online. Prefira o link público quando o
            cliente for assinar sozinho.
          </p>
          <select
            required
            value={subPlanId}
            onChange={(e) => setSubPlanId(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecione o plano</option>
            {plans
              .filter((p) => p.isActive)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {formatMoney(Number(p.price))}
                </option>
              ))}
          </select>

          {bookingClients.length > 0 ? (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[var(--bn-muted)]">
                Cliente que já agendou
              </span>
              <select
                value={pickedClientKey}
                onChange={(e) => pickBookingClient(e.target.value)}
                className={inputClass}
              >
                <option value="">Novo cliente (digitar abaixo)</option>
                {bookingClients.map((c) => {
                  const key = `${c.phone}|${c.name}`;
                  return (
                    <option key={key} value={key}>
                      {c.name} · {c.phone}
                    </option>
                  );
                })}
              </select>
            </label>
          ) : null}

          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--bn-muted)]">
              Nome do cliente
            </span>
            <input
              required
              placeholder="Nome do cliente"
              value={clientName}
              onChange={(e) => {
                setPickedClientKey("");
                setClientName(e.target.value);
              }}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-[var(--bn-muted)]">
              Telefone
            </span>
            <input
              required
              type="tel"
              inputMode="tel"
              placeholder="(11) 99999-0000"
              value={clientPhone}
              onChange={(e) => {
                setPickedClientKey("");
                setClientPhone(formatBrPhoneNational(e.target.value));
              }}
              className={inputClass}
            />
          </label>
          <input
            inputMode="numeric"
            placeholder="CPF/CNPJ (obrigatório com cobrança online)"
            value={clientCpf}
            onChange={(e) => setClientCpf(formatCpfCnpj(e.target.value))}
            className={inputClass}
          />

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-[var(--bn-muted)]">
              Forma de pagamento (com CPF)
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label
                className={
                  billingType === "PIX"
                    ? "cursor-pointer rounded-xl border border-brand-500/50 bg-brand-500/10 px-3 py-3"
                    : "cursor-pointer rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 px-3 py-3 hover:bg-[var(--bn-hover)]"
                }
              >
                <input
                  type="radio"
                  name="club-billing"
                  className="sr-only"
                  checked={billingType === "PIX"}
                  onChange={() => setBillingType("PIX")}
                />
                <span className="block text-sm font-semibold text-[var(--bn-on)]">
                  PIX
                </span>
                <span className="mt-0.5 block text-xs text-[var(--bn-muted)]">
                  QR na hora; fatura mensal para pagar
                </span>
              </label>
              <label
                className={
                  billingType === "CREDIT_CARD"
                    ? "cursor-pointer rounded-xl border border-brand-500/50 bg-brand-500/10 px-3 py-3"
                    : "cursor-pointer rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 px-3 py-3 hover:bg-[var(--bn-hover)]"
                }
              >
                <input
                  type="radio"
                  name="club-billing"
                  className="sr-only"
                  checked={billingType === "CREDIT_CARD"}
                  onChange={() => setBillingType("CREDIT_CARD")}
                />
                <span className="block text-sm font-semibold text-[var(--bn-on)]">
                  Cartão de crédito
                </span>
                <span className="mt-0.5 block text-xs text-[var(--bn-muted)]">
                  Link Asaas; cobrança automática depois
                </span>
              </label>
            </div>
          </fieldset>

          <button
            type="submit"
            className="rounded-full bg-brand-400 px-4 py-2 text-sm font-bold text-zinc-950"
          >
            {billingType === "CREDIT_CARD"
              ? "Gerar adesão / cartão"
              : "Gerar adesão / PIX"}
          </button>

          {lastInvoiceUrl ? (
            <a
              href={lastInvoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm text-[var(--bn-primary)] underline"
            >
              {lastBillingType === "CREDIT_CARD"
                ? "Abrir fatura Asaas (cadastrar cartão)"
                : "Abrir fatura Asaas"}
            </a>
          ) : null}
          {lastPix?.encodedImage ? (
            <div className="space-y-2 rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-low)] p-3">
              <p className="text-xs text-[var(--bn-muted)]">Mostre o QR para o cliente pagar</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${lastPix.encodedImage}`}
                alt="QR PIX clube"
                className="mx-auto h-40 w-40 rounded-lg bg-white p-2"
              />
              {lastPix.payload ? (
                <button
                  type="button"
                  className="w-full truncate rounded-lg border border-[var(--bn-border)] px-2 py-2 text-left text-[10px] text-[var(--bn-muted)]"
                  onClick={() =>
                    void navigator.clipboard.writeText(lastPix.payload!)
                  }
                >
                  Copiar código PIX
                </button>
              ) : null}
            </div>
          ) : null}
        </form>
      </section>

      <section>
        <h3 className="mb-3 font-semibold text-[var(--bn-on)]">Planos</h3>
        <ul className="space-y-2">
          {plans.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--bn-border)] px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-[var(--bn-on)]">
                  {p.name}{" "}
                  {!p.isActive ? (
                    <span className="text-xs text-[var(--bn-muted)]">(inativo)</span>
                  ) : null}
                </p>
                <p className="text-xs text-[var(--bn-muted)]">
                  {formatMoney(Number(p.price))} / {p.cycleDays} dias
                  {p.visitsIncluded != null ? ` · ${p.visitsIncluded} visitas` : " · ilimitado"}
                  {p._count ? ` · ${p._count.subscriptions} assinante(s)` : ""}
                </p>
              </div>
            </li>
          ))}
          {plans.length === 0 ? (
            <li className="text-sm text-[var(--bn-muted)]">Nenhum plano ainda.</li>
          ) : null}
        </ul>
      </section>

      <section>
        <h3 className="mb-3 font-semibold text-[var(--bn-on)]">Assinantes</h3>
        <p className="mb-3 text-xs text-[var(--bn-muted)]">
          Em atraso o benefício já fica bloqueado. Você pode pausar, postergar,
          reativar ou cancelar — o cliente é avisado no WhatsApp (se o bot
          estiver ativo) e por e-mail (se cadastrado).
        </p>
        <div className="overflow-x-auto rounded-2xl border border-[var(--bn-border)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--bn-border)] text-xs uppercase tracking-wider text-[var(--bn-muted)]">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Usos</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => {
                const label = statusLabel(s.status);
                const busy = busyId === s.id;
                const canManage =
                  s.status === "ACTIVE" ||
                  s.status === "PAST_DUE" ||
                  s.status === "PAUSED";
                return (
                  <tr
                    key={s.id}
                    className="border-b border-[var(--bn-border)] text-[var(--bn-on-variant)]"
                  >
                    <td className="px-4 py-3">
                      <div>{s.clientName}</div>
                      <div className="text-xs text-[var(--bn-muted)]">
                        {s.clientPhone}
                      </div>
                    </td>
                    <td className="px-4 py-3">{s.plan.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          s.status === "PAST_DUE" || s.status === "CANCELLED"
                            ? "text-[var(--bn-status-danger)]"
                            : s.status === "PAUSED"
                              ? "text-amber-400"
                              : undefined
                        }
                      >
                        {label}
                      </span>
                      {s.cancelReason ? (
                        <div className="text-xs text-[var(--bn-muted)]">
                          {s.cancelReason}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums">
                      {formatPeriodEnd(s.currentPeriodEnd)}
                    </td>
                    <td className="px-4 py-3">
                      {s.visitsUsed}
                      {s.plan.visitsIncluded != null
                        ? ` / ${s.plan.visitsIncluded}`
                        : ""}
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {s.status === "PAUSED" || s.status === "PAST_DUE" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void actOnSub(s.id, "resume")}
                              className="rounded-full border border-emerald-500/40 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                            >
                              Reativar
                            </button>
                          ) : null}
                          {s.status === "ACTIVE" || s.status === "PAST_DUE" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void actOnSub(s.id, "pause")}
                              className="rounded-full border border-amber-500/40 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-500/10 disabled:opacity-50"
                            >
                              Pausar
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void actOnSub(s.id, "postpone")}
                            className="rounded-full border border-[var(--bn-border)] px-2.5 py-1 text-xs text-[var(--bn-on-variant)] hover:border-white/30 hover:text-[var(--bn-on)] disabled:opacity-50"
                          >
                            Postergar
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void actOnSub(s.id, "cancel")}
                            className="rounded-full border border-rose-500/40 px-2.5 py-1 text-xs text-[var(--bn-status-danger)] hover:bg-rose-500/10 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--bn-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {subs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[var(--bn-muted)]"
                  >
                    Nenhum assinante ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Ativa";
    case "PAST_DUE":
      return "Em atraso";
    case "PAUSED":
      return "Pausada";
    case "CANCELLED":
      return "Cancelada";
    default:
      return status;
  }
}

function formatPeriodEnd(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}
