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

export function ClubAdminPanel({
  services,
  orgSlug,
}: {
  services: ServiceOpt[];
  orgSlug: string;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState(() => formatBrMoneyFromNumber(99));
  const [planCycle, setPlanCycle] = useState("30");
  const [planVisits, setPlanVisits] = useState("");
  const [planServices, setPlanServices] = useState<string[]>([]);

  const [subPlanId, setSubPlanId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCpf, setClientCpf] = useState("");
  const [lastPix, setLastPix] = useState<PixPayload | null>(null);
  const [lastInvoiceUrl, setLastInvoiceUrl] = useState<string | null>(null);

  async function reload() {
    const [pRes, sRes] = await Promise.all([
      fetch("/api/admin/subscription-plans"),
      fetch("/api/admin/client-subscriptions"),
    ]);
    const pData = (await pRes.json()) as { plans?: Plan[]; message?: string };
    const sData = (await sRes.json()) as { subscriptions?: Subscription[]; message?: string };
    if (!pRes.ok) throw new Error(pData.message ?? "Falha ao carregar planos.");
    if (!sRes.ok) throw new Error(sData.message ?? "Falha ao carregar assinantes.");
    setPlans(pData.plans ?? []);
    setSubs(sData.subscriptions ?? []);
    if (!subPlanId && (pData.plans?.length ?? 0) > 0) {
      setSubPlanId(pData.plans!.find((p) => p.isActive)?.id ?? pData.plans![0]!.id);
    }
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
    const cpfDigits = clientCpf.replace(/\D/g, "");
    const res = await fetch("/api/admin/client-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: subPlanId,
        clientName,
        clientPhone,
        clientCpfCnpj: cpfDigits || undefined,
        // Sem CPF → cadastro local ativo (balcão); com CPF → PIX Asaas se ligado
        chargeOnline: cpfDigits.length >= 11 ? true : false,
      }),
    });
    const data = (await res.json()) as {
      message?: string;
      pix?: PixPayload | null;
      invoiceUrl?: string | null;
    };
    if (!res.ok) {
      setError(data.message ?? "Falha ao vincular cliente.");
      return;
    }
    setClientName("");
    setClientPhone("");
    setClientCpf("");
    setLastPix(data.pix ?? null);
    setLastInvoiceUrl(data.invoiceUrl ?? null);
    setMessage(data.message ?? "Cliente adicionado ao clube.");
    await reload();
  }

  async function cancelSub(id: string) {
    const reason = window.prompt(
      "Motivo do cancelamento (opcional). O acesso encerra imediatamente.",
      "Cancelado a pedido do cliente",
    );
    if (reason === null) return;
    setError("");
    setMessage("");
    const res = await fetch(`/api/admin/client-subscriptions/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) {
      setError(data.message ?? "Falha ao cancelar.");
      return;
    }
    setMessage(data.message ?? "Assinatura cancelada.");
    await reload();
  }

  async function copyPublicLink() {
    const url = `${window.location.origin}/${orgSlug}/clube`;
    await navigator.clipboard.writeText(url);
    setMessage("Link do clube copiado.");
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/60";

  if (loading) {
    return <p className="text-sm text-zinc-500">Carregando clube…</p>;
  }

  return (
    <div className="space-y-8">
      {(error || message) && (
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

      <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 px-4 py-4 text-sm">
        <p className="font-semibold text-brand-100">Link para o cliente assinar</p>
        <p className="mt-1 text-xs text-brand-200/80">
          Compartilhe no WhatsApp ou no Instagram. O cliente escolhe o plano, paga o
          PIX e agenda com o mesmo telefone.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="max-w-full truncate rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-300">
            /{orgSlug}/clube
          </code>
          <button
            type="button"
            onClick={() => void copyPublicLink()}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
          >
            Copiar link
          </button>
          <a
            href={`/${orgSlug}/clube`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-brand-200 hover:bg-white/5"
          >
            Abrir página
          </a>
        </div>
      </div>

      <section className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={createPlan} className="space-y-3 rounded-2xl border border-white/10 p-5">
          <h3 className="font-semibold text-white">Novo plano</h3>
          <input
            required
            placeholder="Nome do plano"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            className={inputClass}
          />
          <div className="grid min-w-0 grid-cols-3 gap-2">
            <input
              required
              inputMode="decimal"
              placeholder="Preço (R$)"
              value={planPrice}
              onChange={(e) => setPlanPrice(formatBrMoneyInput(e.target.value))}
              className={`${inputClass} min-w-0`}
            />
            <input
              inputMode="numeric"
              placeholder="Ciclo (dias)"
              value={planCycle}
              onChange={(e) => setPlanCycle(formatIntegerDigits(e.target.value, 4))}
              className={`${inputClass} min-w-0`}
            />
            <input
              inputMode="numeric"
              placeholder="Visitas (opc.)"
              value={planVisits}
              onChange={(e) => setPlanVisits(formatIntegerDigits(e.target.value, 4))}
              className={`${inputClass} min-w-0`}
            />
          </div>
          {services.length > 0 ? (
            <fieldset className="space-y-1">
              <legend className="text-xs text-zinc-500">Serviços inclusos</legend>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                {services.map((s) => {
                  const checked = planServices.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-300"
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

        <form onSubmit={createSub} className="space-y-3 rounded-2xl border border-white/10 p-5">
          <h3 className="font-semibold text-white">Vincular cliente (balcão)</h3>
          <p className="text-xs text-zinc-500">
            Gera PIX na sua Asaas. Com Asaas desligado, o cliente entra ativo sem cobrança
            online. Prefira o link público quando o cliente for assinar sozinho.
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
          <input
            required
            placeholder="Nome do cliente"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className={inputClass}
          />
          <input
            required
            type="tel"
            inputMode="tel"
            placeholder="(11) 99999-0000"
            value={clientPhone}
            onChange={(e) => setClientPhone(formatBrPhoneNational(e.target.value))}
            className={inputClass}
          />
          <input
            inputMode="numeric"
            placeholder="CPF/CNPJ (obrigatório com PIX online)"
            value={clientCpf}
            onChange={(e) => setClientCpf(formatCpfCnpj(e.target.value))}
            className={inputClass}
          />
          <button
            type="submit"
            className="rounded-full bg-brand-400 px-4 py-2 text-sm font-bold text-zinc-950"
          >
            Gerar adesão / PIX
          </button>

          {lastInvoiceUrl ? (
            <a
              href={lastInvoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm text-brand-200 underline"
            >
              Abrir fatura Asaas
            </a>
          ) : null}
          {lastPix?.encodedImage ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="text-xs text-zinc-400">Mostre o QR para o cliente pagar</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${lastPix.encodedImage}`}
                alt="QR PIX clube"
                className="mx-auto h-40 w-40 rounded-lg bg-white p-2"
              />
              {lastPix.payload ? (
                <button
                  type="button"
                  className="w-full truncate rounded-lg border border-white/10 px-2 py-2 text-left text-[10px] text-zinc-500"
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
        <h3 className="mb-3 font-semibold text-white">Planos</h3>
        <ul className="space-y-2">
          {plans.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-zinc-100">
                  {p.name}{" "}
                  {!p.isActive ? (
                    <span className="text-xs text-zinc-500">(inativo)</span>
                  ) : null}
                </p>
                <p className="text-xs text-zinc-500">
                  {formatMoney(Number(p.price))} / {p.cycleDays} dias
                  {p.visitsIncluded != null ? ` · ${p.visitsIncluded} visitas` : " · ilimitado"}
                  {p._count ? ` · ${p._count.subscriptions} assinante(s)` : ""}
                </p>
              </div>
            </li>
          ))}
          {plans.length === 0 ? (
            <li className="text-sm text-zinc-500">Nenhum plano ainda.</li>
          ) : null}
        </ul>
      </section>

      <section>
        <h3 className="mb-3 font-semibold text-white">Assinantes</h3>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Usos</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className="border-b border-white/5 text-zinc-300">
                  <td className="px-4 py-3">
                    <div>{s.clientName}</div>
                    <div className="text-xs text-zinc-500">{s.clientPhone}</div>
                  </td>
                  <td className="px-4 py-3">{s.plan.name}</td>
                  <td className="px-4 py-3">
                    {s.status}
                    {s.cancelReason ? (
                      <div className="text-xs text-zinc-500">{s.cancelReason}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {s.visitsUsed}
                    {s.plan.visitsIncluded != null ? ` / ${s.plan.visitsIncluded}` : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status === "ACTIVE" || s.status === "PAST_DUE" ? (
                      <button
                        type="button"
                        onClick={() => void cancelSub(s.id)}
                        className="rounded-full border border-rose-500/40 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/10"
                      >
                        Cancelar
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {subs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
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
