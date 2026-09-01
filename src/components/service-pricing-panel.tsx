"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";

import {
  AdminFinanceUnitFilter,
  type FinanceUnitOption,
} from "@/components/admin-finance-unit-filter";
import { formatMoney } from "@/lib/utils";

type CostRow = {
  serviceId: string;
  serviceName: string;
  unitName: string;
  currentPrice: number;
  durationMinutes: number;
  directLaborCost: number;
  materialCost: number;
  cost: {
    fixedCostAllocated: number;
    csvTotal: number;
  };
  suggestedPrice: number;
  gap: number;
  belowCost: boolean;
};

type Props = {
  units: FinanceUnitOption[];
};

export function ServicePricingPanel({ units }: Props) {
  const [unitId, setUnitId] = useState("");
  const [rows, setRows] = useState<CostRow[]>([]);
  const [fixedCostPerHour, setFixedCostPerHour] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mod, setMod] = useState("");
  const [mat, setMat] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (unitId) qs.set("unitId", unitId);
      const res = await fetch(`/api/admin/finance/service-costs?${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        rows: CostRow[];
        fixedCostPerHour: number;
      };
      setRows(data.rows);
      setFixedCostPerHour(data.fixedCostPerHour);
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProfile(serviceId: string) {
    await fetch("/api/admin/finance/service-costs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        directLaborCost: Number(mod) || 0,
        materialCost: Number(mat) || 0,
      }),
    });
    setEditingId(null);
    void load();
  }

  async function applyPrice(serviceId: string, price: number) {
    await fetch("/api/admin/finance/service-costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId, price }),
    });
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] p-4 text-sm text-[var(--bn-on-variant)]">
        <p>
          <strong className="text-[var(--bn-on)]">CSV</strong> = MOD + MAT + DF
          (despesa fixa rateada por hora).
        </p>
        <p className="mt-1">
          <strong className="text-[var(--bn-on)]">PV</strong> = CSV ÷ (1 − DV% −
          ML%). Custo fixo/hora atual:{" "}
          <strong className="text-[var(--bn-primary)]">
            {formatMoney(fixedCostPerHour)}/h
          </strong>
        </p>
      </div>

      <AdminFinanceUnitFilter units={units} value={unitId} onChange={setUnitId} />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="h-8 w-8 animate-spin text-[var(--bn-primary)]" />
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.serviceId}
              className={`rounded-2xl border p-4 ${
                row.belowCost
                  ? "border-[var(--bn-status-danger)]/40 bg-[var(--bn-status-danger)]/5"
                  : "border-[var(--bn-outline)] bg-[var(--bn-surface)]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--bn-on)]">{row.serviceName}</p>
                  <p className="text-xs text-[var(--bn-on-variant)]">
                    {row.unitName} · {row.durationMinutes} min
                  </p>
                </div>
                {row.belowCost ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--bn-status-danger)]">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Abaixo do custo
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
                <div>
                  <span className="text-xs text-[var(--bn-on-variant)]">Preço atual</span>
                  <p className="font-medium">{formatMoney(row.currentPrice)}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--bn-on-variant)]">CSV</span>
                  <p className="font-medium">{formatMoney(row.cost.csvTotal)}</p>
                </div>
                <div>
                  <span className="text-xs text-[var(--bn-on-variant)]">Preço sugerido</span>
                  <p className="font-medium text-[var(--bn-primary)]">
                    {formatMoney(row.suggestedPrice)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-[var(--bn-on-variant)]">Gap</span>
                  <p className="font-medium">{formatMoney(row.gap)}</p>
                </div>
              </div>

              {editingId === row.serviceId ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    type="number"
                    placeholder="MOD (R$)"
                    value={mod}
                    onChange={(e) => setMod(e.target.value)}
                    className="rounded-lg border border-[var(--bn-outline)] px-2 py-1 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="MAT (R$)"
                    value={mat}
                    onChange={(e) => setMat(e.target.value)}
                    className="rounded-lg border border-[var(--bn-outline)] px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void saveProfile(row.serviceId)}
                    className="rounded-lg bg-[var(--bn-primary)] px-3 py-1 text-sm font-semibold text-zinc-950"
                  >
                    Salvar custos
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(row.serviceId);
                      setMod(String(row.directLaborCost));
                      setMat(String(row.materialCost));
                    }}
                    className="rounded-lg border border-[var(--bn-outline)] px-3 py-1 text-sm"
                  >
                    Editar MOD/MAT
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void applyPrice(row.serviceId, row.suggestedPrice)
                    }
                    className="rounded-lg bg-[var(--bn-primary)] px-3 py-1 text-sm font-semibold text-zinc-950"
                  >
                    Aplicar preço sugerido
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
