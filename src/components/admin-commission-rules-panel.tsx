"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

import {
  formatIntegerDigits,
  formatBrMoneyFromNumber,
  formatBrMoneyInput,
  parseBrMoneyInput,
} from "@/lib/br-input-masks";
import type { CommissionTier } from "@/lib/commission-tiers";

type RuleRow = {
  staffMemberId: string;
  professionalName: string;
  servicePercent: number;
  subscriptionPercent: number;
  productPercent: number;
  tiers: CommissionTier[];
};

export function AdminCommissionRulesPanel() {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        servicePercent: string;
        subscriptionPercent: string;
        productPercent: string;
        tiers: { minRevenue: string; servicePercent: string }[];
      }
    >
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/finance/commission-rules", {
        cache: "no-store",
      });
      if (!res.ok) {
        setRules([]);
        return;
      }
      const data = (await res.json()) as { rules: RuleRow[] };
      setRules(data.rules);
      const next: typeof drafts = {};
      for (const r of data.rules) {
        next[r.staffMemberId] = {
          servicePercent: String(r.servicePercent),
          subscriptionPercent: String(r.subscriptionPercent),
          productPercent: String(r.productPercent),
          tiers: r.tiers.map((t) => ({
            minRevenue: formatBrMoneyFromNumber(t.minRevenue),
            servicePercent: String(t.servicePercent),
          })),
        };
      }
      setDrafts(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(staffMemberId: string) {
    const draft = drafts[staffMemberId];
    if (!draft) return;
    setSavingId(staffMemberId);
    setMessage(null);
    try {
      const tiers = draft.tiers
        .map((t) => ({
          minRevenue: parseBrMoneyInput(t.minRevenue),
          servicePercent: Number(t.servicePercent),
        }))
        .filter(
          (t) =>
            Number.isFinite(t.minRevenue) &&
            Number.isFinite(t.servicePercent) &&
            t.servicePercent >= 0 &&
            t.servicePercent <= 100,
        );

      const res = await fetch("/api/admin/finance/commission-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffMemberId,
          servicePercent: Number(draft.servicePercent) || 0,
          subscriptionPercent: Number(draft.subscriptionPercent) || 0,
          productPercent: Number(draft.productPercent) || 0,
          tiers,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setMessage(data.message ?? "Falha ao salvar regra.");
        return;
      }
      setMessage("Regra de comissão salva.");
      await load();
    } finally {
      setSavingId(null);
    }
  }

  const field =
    "min-h-10 w-full rounded-xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] px-3 py-2 text-sm text-[var(--bn-on)]";

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <LoaderCircle className="size-6 animate-spin text-[var(--bn-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--bn-muted)]">
        Percentuais base e faixas escalonadas (maior{" "}
        <code className="text-[10px]">minRevenue</code> atingido define o % de
        serviço avulso no cálculo).
      </p>
      {message ? (
        <p className="rounded-xl border border-[var(--bn-status-info)]/35 bg-[var(--bn-status-info)]/10 px-4 py-3 text-sm text-[var(--bn-status-info)]">
          {message}
        </p>
      ) : null}
      <ul className="space-y-3">
        {rules.map((r) => {
          const draft = drafts[r.staffMemberId];
          if (!draft) return null;
          const open = expanded === r.staffMemberId;
          return (
            <li
              key={r.staffMemberId}
              className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface-elevated)] p-4"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() =>
                  setExpanded(open ? null : r.staffMemberId)
                }
              >
                <span className="font-medium text-[var(--bn-on)]">
                  {r.professionalName}
                </span>
                <span className="text-xs text-[var(--bn-muted)]">
                  {r.servicePercent}% avulso
                  {r.tiers.length > 0 ? ` · ${r.tiers.length} faixa(s)` : ""}
                </span>
              </button>
              {open ? (
                <div className="mt-4 space-y-3 border-t border-[var(--bn-outline)] pt-4">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className="block space-y-1">
                      <span className="text-xs text-[var(--bn-muted)]">
                        % serviço (base)
                      </span>
                      <input
                        inputMode="decimal"
                        className={field}
                        value={draft.servicePercent}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [r.staffMemberId]: {
                              ...draft,
                              servicePercent: e.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-[var(--bn-muted)]">
                        % assinatura
                      </span>
                      <input
                        inputMode="decimal"
                        className={field}
                        value={draft.subscriptionPercent}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [r.staffMemberId]: {
                              ...draft,
                              subscriptionPercent: e.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-[var(--bn-muted)]">
                        % produtos
                      </span>
                      <input
                        inputMode="decimal"
                        className={field}
                        value={draft.productPercent}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [r.staffMemberId]: {
                              ...draft,
                              productPercent: e.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-[var(--bn-on-variant)]">
                        Faixas escalonadas
                      </p>
                      <button
                        type="button"
                        className="text-xs text-[var(--bn-primary)] hover:underline"
                        onClick={() =>
                          setDrafts((prev) => ({
                            ...prev,
                            [r.staffMemberId]: {
                              ...draft,
                              tiers: [
                                ...draft.tiers,
                                { minRevenue: "", servicePercent: "" },
                              ],
                            },
                          }))
                        }
                      >
                        + faixa
                      </button>
                    </div>
                    {draft.tiers.length === 0 ? (
                      <p className="text-xs text-[var(--bn-muted)]">
                        Sem faixas — usa o % base.
                      </p>
                    ) : (
                      draft.tiers.map((t, idx) => (
                        <div
                          key={idx}
                          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                        >
                          <input
                            inputMode="decimal"
                            placeholder="Faturamento mín. (R$)"
                            className={field}
                            value={t.minRevenue}
                            onChange={(e) => {
                              const tiers = [...draft.tiers];
                              tiers[idx] = {
                                ...t,
                                minRevenue: formatBrMoneyInput(e.target.value),
                              };
                              setDrafts((prev) => ({
                                ...prev,
                                [r.staffMemberId]: { ...draft, tiers },
                              }));
                            }}
                          />
                          <input
                            inputMode="decimal"
                            placeholder="% serviço"
                            className={field}
                            value={t.servicePercent}
                            onChange={(e) => {
                              const tiers = [...draft.tiers];
                              tiers[idx] = {
                                ...t,
                                servicePercent: formatIntegerDigits(
                                  e.target.value,
                                  3,
                                ),
                              };
                              setDrafts((prev) => ({
                                ...prev,
                                [r.staffMemberId]: { ...draft, tiers },
                              }));
                            }}
                          />
                          <button
                            type="button"
                            className="text-xs text-[var(--bn-status-danger)]"
                            onClick={() => {
                              const tiers = draft.tiers.filter(
                                (_, i) => i !== idx,
                              );
                              setDrafts((prev) => ({
                                ...prev,
                                [r.staffMemberId]: { ...draft, tiers },
                              }));
                            }}
                          >
                            Remover
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={savingId === r.staffMemberId}
                    onClick={() => void save(r.staffMemberId)}
                    className="rounded-xl bg-[var(--bn-primary)] px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
                  >
                    {savingId === r.staffMemberId ? "Salvando…" : "Salvar regra"}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
