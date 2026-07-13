"use client";

import { FormEvent, useEffect, useState } from "react";

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

export function ClubAdminPanel({ services }: { services: ServiceOpt[] }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("99");
  const [planCycle, setPlanCycle] = useState("30");
  const [planVisits, setPlanVisits] = useState("");
  const [planServices, setPlanServices] = useState<string[]>([]);

  const [subPlanId, setSubPlanId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

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
        price: Number(planPrice),
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
    setMessage("Plano criado.");
    await reload();
  }

  async function createSub(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/client-subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: subPlanId,
        clientName,
        clientPhone,
      }),
    });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) {
      setError(data.message ?? "Falha ao vincular cliente.");
      return;
    }
    setClientName("");
    setClientPhone("");
    setMessage("Cliente adicionado ao clube.");
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

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/60";

  if (loading) return <p className="text-sm text-zinc-400">Carregando clube…</p>;

  return (
    <div className="space-y-10">
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
          <div className="grid grid-cols-3 gap-2">
            <input
              required
              type="number"
              step="0.01"
              min="1"
              placeholder="Preço"
              value={planPrice}
              onChange={(e) => setPlanPrice(e.target.value)}
              className={inputClass}
            />
            <input
              type="number"
              min="7"
              placeholder="Ciclo (dias)"
              value={planCycle}
              onChange={(e) => setPlanCycle(e.target.value)}
              className={inputClass}
            />
            <input
              type="number"
              min="1"
              placeholder="Visitas (opc.)"
              value={planVisits}
              onChange={(e) => setPlanVisits(e.target.value)}
              className={inputClass}
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
          <h3 className="font-semibold text-white">Vincular cliente</h3>
          <p className="text-xs text-zinc-500">
            Cobrança recorrente automática fica para a próxima onda — aqui você marca o assinante e
            controla o cancelamento com clareza.
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
            placeholder="Telefone"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            className="rounded-full bg-brand-400 px-4 py-2 text-sm font-bold text-zinc-950"
          >
            Adicionar ao clube
          </button>
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
                    {s.status === "ACTIVE" ? (
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
