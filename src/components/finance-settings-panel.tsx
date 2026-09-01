"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { formatMoney } from "@/lib/utils";

type Settings = {
  proLaboreMonthly: number;
  productiveHoursPerMonth: number;
  defaultVariableExpensePercent: number;
  defaultProfitMarginPercent: number;
  monthlyFixedCostsOverride: number | null;
  autoSettleReceivablesOnDueDate: boolean;
  autoCreateProLaboreExpense: boolean;
  paymentMethodFeesJson: Record<string, number> | null;
};

type Category = {
  id: string;
  kind: "EXPENSE" | "INCOME";
  name: string;
  parentId: string | null;
  costType: "NONE" | "FIXED" | "VARIABLE";
};

type BankAccount = { id: string; name: string; isActive: boolean };

const field =
  "min-h-11 w-full rounded-xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] px-3 py-2 text-sm text-[var(--bn-on)]";

export function FinanceSettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newBank, setNewBank] = useState("");
  const [feesPix, setFeesPix] = useState("");
  const [feesCredit, setFeesCredit] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/finance/settings", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        settings: Settings;
        categories: Category[];
        bankAccounts: BankAccount[];
      };
      setSettings(data.settings);
      setCategories(data.categories);
      setBankAccounts(data.bankAccounts);
      const fees = data.settings.paymentMethodFeesJson ?? {};
      setFeesPix(String(fees.PIX ?? fees.pix ?? 0));
      setFeesCredit(String(fees.CREDIT ?? fees.CREDIT_CARD ?? 3.5));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/finance/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          paymentMethodFeesJson: {
            PIX: Number(feesPix) || 0,
            CREDIT: Number(feesCredit) || 0,
          },
          categoryCostTypes: categories
            .filter((c) => c.kind === "EXPENSE")
            .map((c) => ({ categoryId: c.id, costType: c.costType })),
        }),
      });
      if (!res.ok) {
        setMessage("Não foi possível salvar.");
        return;
      }
      const data = await res.json();
      setSettings(data.settings);
      setCategories(data.categories);
      setBankAccounts(data.bankAccounts);
      setMessage("Configurações salvas.");
    } finally {
      setSaving(false);
    }
  }

  async function addBank() {
    if (!newBank.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/finance/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newBankAccountName: newBank.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setBankAccounts(data.bankAccounts);
        setNewBank("");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex justify-center py-16">
        <LoaderCircle className="h-8 w-8 animate-spin text-[var(--bn-primary)]" />
      </div>
    );
  }

  const expenseCategories = categories.filter((c) => c.kind === "EXPENSE");

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--bn-on-variant)]">Pró-labore mensal (R$)</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={settings.proLaboreMonthly}
            onChange={(e) =>
              setSettings({ ...settings, proLaboreMonthly: Number(e.target.value) })
            }
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--bn-on-variant)]">Horas produtivas / mês</span>
          <input
            type="number"
            min={1}
            value={settings.productiveHoursPerMonth}
            onChange={(e) =>
              setSettings({
                ...settings,
                productiveHoursPerMonth: Number(e.target.value),
              })
            }
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--bn-on-variant)]">Despesas variáveis padrão (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={settings.defaultVariableExpensePercent}
            onChange={(e) =>
              setSettings({
                ...settings,
                defaultVariableExpensePercent: Number(e.target.value),
              })
            }
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--bn-on-variant)]">Margem de lucro alvo (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={settings.defaultProfitMarginPercent}
            onChange={(e) =>
              setSettings({
                ...settings,
                defaultProfitMarginPercent: Number(e.target.value),
              })
            }
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-[var(--bn-on-variant)]">
            Override despesas fixas mensais (opcional — deixe vazio para somar categorias)
          </span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={settings.monthlyFixedCostsOverride ?? ""}
            onChange={(e) =>
              setSettings({
                ...settings,
                monthlyFixedCostsOverride:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className={field}
            placeholder="Ex.: 4000"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] p-4">
        <h3 className="text-sm font-semibold text-[var(--bn-on)]">Taxas por forma de pagamento (%)</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--bn-on-variant)]">PIX</span>
            <input type="number" min={0} max={100} step={0.1} value={feesPix} onChange={(e) => setFeesPix(e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--bn-on-variant)]">Cartão de crédito</span>
            <input type="number" min={0} max={100} step={0.1} value={feesCredit} onChange={(e) => setFeesCredit(e.target.value)} className={field} />
          </label>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--bn-on)]">
        <input
          type="checkbox"
          checked={settings.autoCreateProLaboreExpense}
          onChange={(e) =>
            setSettings({
              ...settings,
              autoCreateProLaboreExpense: e.target.checked,
            })
          }
          className="rounded border-[var(--bn-outline)]"
        />
        Gerar lançamento mensal de pró-labore em contas a pagar
      </label>

      <label className="flex items-center gap-2 text-sm text-[var(--bn-on)]">
        <input
          type="checkbox"
          checked={settings.autoSettleReceivablesOnDueDate}
          onChange={(e) =>
            setSettings({
              ...settings,
              autoSettleReceivablesOnDueDate: e.target.checked,
            })
          }
          className="rounded border-[var(--bn-outline)]"
        />
        Baixa automática de contas a receber no vencimento
      </label>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-[var(--bn-on)]">
          Classificação de categorias de despesa
        </h3>
        <div className="space-y-2">
          {expenseCategories.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--bn-outline)] px-3 py-2"
            >
              <span className="text-sm text-[var(--bn-on)]">{c.name}</span>
              <select
                value={c.costType}
                onChange={(e) =>
                  setCategories((prev) =>
                    prev.map((row) =>
                      row.id === c.id
                        ? {
                            ...row,
                            costType: e.target.value as Category["costType"],
                          }
                        : row,
                    ),
                  )
                }
                className="rounded-lg border border-[var(--bn-outline)] bg-[var(--bn-surface)] px-2 py-1 text-sm"
              >
                <option value="NONE">Sem classificação</option>
                <option value="FIXED">Fixa</option>
                <option value="VARIABLE">Variável</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-[var(--bn-on)]">Contas bancárias</h3>
        <ul className="mb-3 space-y-1 text-sm text-[var(--bn-on-variant)]">
          {bankAccounts.map((b) => (
            <li key={b.id}>{b.name}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <input
            value={newBank}
            onChange={(e) => setNewBank(e.target.value)}
            placeholder="Nome da conta"
            className={`${field} sm:max-w-xs`}
          />
          <button
            type="button"
            onClick={() => void addBank()}
            className="rounded-xl border border-[var(--bn-outline)] px-4 py-2 text-sm font-medium"
          >
            Adicionar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="min-h-11 rounded-xl bg-[var(--bn-primary)] px-6 py-2.5 text-sm font-semibold text-zinc-950 hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar configurações"}
        </button>
        {message ? (
          <span className="text-sm text-[var(--bn-on-variant)]">{message}</span>
        ) : null}
      </div>

      <p className="text-xs text-[var(--bn-on-variant)]">
        Pró-labore atual: {formatMoney(settings.proLaboreMonthly)} · Horas:{" "}
        {settings.productiveHoursPerMonth}h
      </p>
    </div>
  );
}
