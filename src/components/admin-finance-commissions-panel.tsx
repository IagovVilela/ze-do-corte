"use client";

import { useCallback, useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { LoaderCircle } from "lucide-react";

import {
  AdminFinanceUnitFilter,
  type FinanceUnitOption,
} from "@/components/admin-finance-unit-filter";
import { cn, formatMoney } from "@/lib/utils";

type Row = {
  staffMemberId: string;
  professionalName: string;
  avulsoGross: number;
  avulsoNet: number;
  subscriptionGross: number;
  subscriptionNet: number;
  productsGross: number;
  productsNet: number;
  bonus: number;
  advances: number;
  totalGross: number;
  totalNet: number;
};

type Snapshot = {
  subscriptionRevenue: number;
  potPercent: number;
  potAmount: number;
  rows: Row[];
};

type Props = {
  units: FinanceUnitOption[];
};

export function AdminFinanceCommissionsPanel({ units }: Props) {
  const [from, setFrom] = useState(
    format(subDays(new Date(), 29), "yyyy-MM-dd"),
  );
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [unitId, setUnitId] = useState("");
  const [potPercent, setPotPercent] = useState("30");
  const [data, setData] = useState<Snapshot | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const qs = new URLSearchParams({
        from,
        to,
        potPercent,
      });
      if (unitId) qs.set("unitId", unitId);
      const res = await fetch(`/api/admin/finance/commissions?${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setData(null);
        return;
      }
      const snap = (await res.json()) as Snapshot;
      setData(snap);
      setSelected(new Set(snap.rows.map((r) => r.staffMemberId)));
    } finally {
      setLoading(false);
    }
  }, [from, to, potPercent, unitId]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!data) return;
    if (selected.size === data.rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.rows.map((r) => r.staffMemberId)));
    }
  }

  async function generate() {
    if (selected.size === 0) {
      setMessage("Selecione ao menos um profissional.");
      return;
    }
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/finance/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          potPercent: Number(potPercent) || 30,
          staffMemberIds: [...selected],
          dueDate: format(new Date(), "yyyy-MM-dd"),
          unitId: unitId || null,
        }),
      });
      const payload = (await res.json()) as {
        message?: string;
        created?: number;
      };
      if (!res.ok) {
        setMessage(payload.message ?? "Falha ao gerar.");
        return;
      }
      setMessage(
        `${payload.created ?? 0} movimentação(ões) criada(s) em Contas a pagar.`,
      );
    } finally {
      setGenerating(false);
    }
  }

  const field =
    "min-h-11 w-full rounded-xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] px-3 py-2 text-sm text-[var(--bn-on)] sm:min-h-0 sm:w-auto";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--bn-on-variant)]">Data inicial</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--bn-on-variant)]">Data final</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={field}
          />
        </label>
        <AdminFinanceUnitFilter
          units={units}
          value={unitId}
          onChange={setUnitId}
        />
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-11 w-full rounded-xl bg-[var(--bn-primary)] px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:opacity-90 sm:min-h-0 sm:w-auto sm:py-2"
        >
          Filtrar
        </button>
      </div>

      {data ? (
        <div className="grid gap-3 rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface-elevated)] p-4 sm:flex sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1 sm:space-y-1">
            <span className="text-xs text-[var(--bn-on-variant)]">
              Valor recebido de assinatura
            </span>
            <p className="rounded-xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] px-3 py-2.5 text-sm font-semibold tabular-nums">
              {formatMoney(data.subscriptionRevenue)}
            </p>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--bn-on-variant)]">
              Porcentagem do pote
            </span>
            <input
              type="number"
              min={0}
              max={100}
              value={potPercent}
              onChange={(e) => setPotPercent(e.target.value)}
              className={cn(field, "tabular-nums sm:w-24")}
            />
          </label>
          <p className="text-xs text-[var(--bn-on-variant)] sm:pb-2">
            Pote: {formatMoney(data.potAmount)}
          </p>
          <button
            type="button"
            disabled={generating}
            onClick={() => void generate()}
            className="min-h-11 w-full rounded-xl border border-[var(--bn-primary)]/35 bg-[var(--bn-primary-container)]/12 px-4 py-2.5 text-sm font-semibold text-[var(--bn-primary)] transition hover:bg-[var(--bn-primary-container)]/20 disabled:opacity-60 sm:min-h-0 sm:w-auto sm:py-2"
          >
            {generating ? "Gerando…" : "Gerar movimentações"}
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="rounded-xl border border-[var(--bn-status-info)]/35 bg-[var(--bn-status-info)]/10 px-4 py-3 text-sm text-[var(--bn-status-info)]">
          {message}
        </p>
      ) : null}

      {loading || !data ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="size-6 animate-spin text-[var(--bn-primary)]" />
        </div>
      ) : (
        <>
          <ul className="space-y-3 lg:hidden">
            {data.rows.map((r) => (
              <li
                key={r.staffMemberId}
                className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface-elevated)] p-4"
              >
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0"
                    checked={selected.has(r.staffMemberId)}
                    onChange={() => toggle(r.staffMemberId)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-[var(--bn-on)]">
                      {r.professionalName}
                    </span>
                    <span className="mt-1 block text-lg font-bold tabular-nums text-[var(--bn-primary)]">
                      Líq. {formatMoney(r.totalNet)}
                    </span>
                    <span className="mt-0.5 block text-xs tabular-nums text-[var(--bn-on-variant)]">
                      Bruto {formatMoney(r.totalGross)}
                    </span>
                  </span>
                </label>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-[var(--bn-surface)] px-2.5 py-2">
                    <dt className="text-[var(--bn-on-variant)]">Avulso</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-[var(--bn-on)]">
                      {formatMoney(r.avulsoNet)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-[var(--bn-surface)] px-2.5 py-2">
                    <dt className="text-[var(--bn-on-variant)]">Assinatura</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-[var(--bn-on)]">
                      {formatMoney(r.subscriptionNet)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-[var(--bn-surface)] px-2.5 py-2">
                    <dt className="text-[var(--bn-on-variant)]">Produtos</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-[var(--bn-on)]">
                      {formatMoney(r.productsNet)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-[var(--bn-surface)] px-2.5 py-2">
                    <dt className="text-[var(--bn-on-variant)]">Bônus / vales</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-[var(--bn-on)]">
                      {formatMoney(r.bonus)} / {formatMoney(r.advances)}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-2xl border border-[var(--bn-outline)] lg:block">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-[var(--bn-surface-elevated)] text-[10px] tracking-wide text-[var(--bn-on-variant)] uppercase">
                <tr>
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={
                        data.rows.length > 0 &&
                        selected.size === data.rows.length
                      }
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-3 py-3 font-semibold">Profissional</th>
                  <th className="px-3 py-3 font-semibold">Serviços avulso</th>
                  <th className="px-3 py-3 font-semibold">Serviços assinatura</th>
                  <th className="px-3 py-3 font-semibold">Produtos</th>
                  <th className="px-3 py-3 font-semibold">Bônus</th>
                  <th className="px-3 py-3 font-semibold">Vales</th>
                  <th className="px-3 py-3 font-semibold">Total bruto</th>
                  <th className="px-3 py-3 font-semibold">Total líquido</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr
                    key={r.staffMemberId}
                    className="border-t border-[var(--bn-outline)] text-[var(--bn-on)]"
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.staffMemberId)}
                        onChange={() => toggle(r.staffMemberId)}
                      />
                    </td>
                    <td className="px-3 py-3 font-medium">{r.professionalName}</td>
                    <td className="px-3 py-3 text-xs tabular-nums">
                      <div>Bruto {formatMoney(r.avulsoGross)}</div>
                      <div className="text-[var(--bn-on-variant)]">
                        Líq. {formatMoney(r.avulsoNet)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs tabular-nums">
                      <div>Bruto {formatMoney(r.subscriptionGross)}</div>
                      <div className="text-[var(--bn-on-variant)]">
                        Líq. {formatMoney(r.subscriptionNet)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs tabular-nums">
                      <div>Bruto {formatMoney(r.productsGross)}</div>
                      <div className="text-[var(--bn-on-variant)]">
                        Líq. {formatMoney(r.productsNet)}
                      </div>
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {formatMoney(r.bonus)}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {formatMoney(r.advances)}
                    </td>
                    <td className="px-3 py-3 font-semibold tabular-nums">
                      {formatMoney(r.totalGross)}
                    </td>
                    <td className="px-3 py-3 font-bold tabular-nums text-[var(--bn-primary)]">
                      {formatMoney(r.totalNet)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.rows.length > 0 ? (
            <div className="flex items-center gap-3 lg:hidden">
              <button
                type="button"
                onClick={toggleAll}
                className="min-h-10 rounded-lg border border-[var(--bn-outline)] px-3 py-2 text-xs font-semibold text-[var(--bn-on-variant)]"
              >
                {selected.size === data.rows.length
                  ? "Desmarcar todos"
                  : "Selecionar todos"}
              </button>
              <span className="text-xs text-[var(--bn-on-variant)]">
                {selected.size} selecionado(s)
              </span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
