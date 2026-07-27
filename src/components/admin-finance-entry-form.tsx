"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { LoaderCircle } from "lucide-react";

import { formatBrMoneyInput, parseBrMoneyInput } from "@/lib/br-input-masks";
import { cn, formatMoney } from "@/lib/utils";

type Unit = { id: string; name: string };
type Category = { id: string; name: string; parentId: string | null; kind: string };

type Props = {
  kind: "EXPENSE" | "INCOME";
  units: Unit[];
};

export function AdminFinanceEntryForm({ kind, units }: Props) {
  const title = kind === "EXPENSE" ? "Criar despesa" : "Criar receita";
  const backHref =
    kind === "EXPENSE" ? "/admin/financeiro/contas-a-pagar" : "/admin/financeiro/contas-a-receber";

  const [categories, setCategories] = useState<Category[]>([]);
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [amountLabel, setAmountLabel] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [interestPercent, setInterestPercent] = useState("0");
  const [notes, setNotes] = useState("");
  const [repeatMonthly, setRepeatMonthly] = useState(false);
  const [paymentCondition, setPaymentCondition] = useState<"CASH" | "INSTALLMENT">(
    "CASH",
  );
  const [paymentMethod, setPaymentMethod] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [newCategoryName, setNewCategoryName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roots = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories],
  );
  const subs = useMemo(
    () => categories.filter((c) => c.parentId === categoryId),
    [categories, categoryId],
  );

  const netPreview = useMemo(() => {
    const amount = parseBrMoneyInput(amountLabel) || 0;
    const d = Number(discountPercent) || 0;
    const i = Number(interestPercent) || 0;
    const after = amount * (1 - Math.min(100, Math.max(0, d)) / 100);
    return Math.round(after * (1 + Math.max(0, i) / 100) * 100) / 100;
  }, [amountLabel, discountPercent, interestPercent]);

  async function loadCategories() {
    const res = await fetch(
      `/api/admin/finance/categories?kind=${kind}`,
      { cache: "no-store" },
    );
    if (!res.ok) return;
    const data = (await res.json()) as { categories?: Category[] };
    setCategories(data.categories ?? []);
  }

  useEffect(() => {
    void loadCategories();
  }, [kind]);

  async function addCategory() {
    const name = newCategoryName.trim();
    if (name.length < 2) return;
    const res = await fetch("/api/admin/finance/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, name }),
    });
    if (!res.ok) {
      setError("Não foi possível criar a categoria.");
      return;
    }
    setNewCategoryName("");
    await loadCategories();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const amount = parseBrMoneyInput(amountLabel);
    if (amount <= 0) {
      setError("Informe um valor válido.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/finance/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          description,
          amount,
          discountPercent: Number(discountPercent) || 0,
          interestPercent: Number(interestPercent) || 0,
          categoryId: subcategoryId || categoryId || null,
          notes: notes || null,
          paymentCondition,
          paymentMethod: paymentMethod || null,
          bankAccount: bankAccount || null,
          dueDate,
          unitId: unitId || null,
          repeatMonthly,
          status: paymentCondition === "CASH" ? "PAID" : "OPEN",
        }),
      });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(payload.message ?? "Falha ao salvar.");
        return;
      }
      setMessage("Lançamento salvo.");
      setDescription("");
      setAmountLabel("");
      setNotes("");
      setDiscountPercent("0");
      setInterestPercent("0");
    } catch {
      setError("Erro de rede.");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "min-h-11 w-full rounded-xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] px-3 py-2.5 text-base text-[var(--bn-on)] outline-none focus:border-[var(--bn-primary)] sm:min-h-0 sm:text-sm";

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-8">
      <div className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface-elevated)] p-5 sm:p-6">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--bn-on)] uppercase">
          Dados
        </h2>
        <div className="mt-4 grid gap-4">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--bn-on-variant)]">
              Filial *
            </span>
            <select
              required
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className={field}
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--bn-on-variant)]">
              Descrição *
            </span>
            <input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={field}
              maxLength={200}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-[var(--bn-on-variant)]">
                Valor *
              </span>
              <input
                required
                value={amountLabel}
                onChange={(e) =>
                  setAmountLabel(formatBrMoneyInput(e.target.value))
                }
                className={cn(field, "tabular-nums")}
                placeholder="0,00"
                inputMode="decimal"
              />
            </label>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-[var(--bn-on-variant)]">
                Líquido (prévia)
              </span>
              <p className="rounded-xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] px-3 py-2.5 text-sm font-semibold tabular-nums text-[var(--bn-on)]">
                {formatMoney(netPreview)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:gap-4">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-[var(--bn-on-variant)]">
                Categoria
              </span>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubcategoryId("");
                }}
                className={field}
              >
                <option value="">Sem categoria</option>
                {roots.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nova categoria"
                className={cn(field, "min-w-0 flex-1 sm:max-w-[9rem]")}
              />
              <button
                type="button"
                onClick={() => void addCategory()}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--bn-primary)] text-sm font-semibold text-zinc-950 transition hover:opacity-90 sm:size-auto sm:px-3 sm:py-2.5"
                aria-label="Adicionar categoria"
              >
                +
              </button>
            </div>
          </div>

          {subs.length > 0 ? (
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-[var(--bn-on-variant)]">
                Subcategoria
              </span>
              <select
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                className={field}
              >
                <option value="">—</option>
                {subs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-[var(--bn-on-variant)]">
                Descontos (%)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className={field}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-[var(--bn-on-variant)]">
                Juros (%)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={interestPercent}
                onChange={(e) => setInterestPercent(e.target.value)}
                className={field}
              />
            </label>
          </div>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--bn-on-variant)]">
              Observações
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className={field}
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--bn-outline)] bg-[var(--bn-surface-elevated)] p-5 sm:p-6">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--bn-on)] uppercase">
          Condição de pagamento
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-[var(--bn-on)] sm:col-span-2">
            <input
              type="checkbox"
              checked={repeatMonthly}
              onChange={(e) => setRepeatMonthly(e.target.checked)}
              className="size-4 rounded border-[var(--bn-outline)]"
            />
            Repetir lançamento mensalmente?
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--bn-on-variant)]">
              Condição *
            </span>
            <select
              value={paymentCondition}
              onChange={(e) =>
                setPaymentCondition(e.target.value as "CASH" | "INSTALLMENT")
              }
              className={field}
            >
              <option value="CASH">À vista</option>
              <option value="INSTALLMENT">A prazo</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--bn-on-variant)]">
              Forma de pagamento
            </span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={field}
            >
              <option value="">—</option>
              <option value="PIX">PIX</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Cartão">Cartão</option>
              <option value="Transferência">Transferência</option>
              <option value="Boleto">Boleto</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--bn-on-variant)]">
              Conta bancária
            </span>
            <input
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className={field}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--bn-on-variant)]">
              Data de vencimento *
            </span>
            <input
              required
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={field}
            />
          </label>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-[var(--bn-status-danger)]/35 bg-[var(--bn-status-danger)]/10 px-4 py-3 text-sm text-[var(--bn-status-danger)]">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-[var(--bn-status-ok)]/35 bg-[var(--bn-status-ok)]/10 px-4 py-3 text-sm text-[var(--bn-status-ok)]">
          {message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Link
          href={backHref}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--bn-border)] px-5 py-2.5 text-sm font-semibold text-[var(--bn-on-variant)] transition hover:bg-[var(--bn-hover)] hover:text-[var(--bn-on)] sm:min-h-0 sm:w-auto"
        >
          Voltar
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--bn-primary)] px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:opacity-90 disabled:opacity-60 sm:min-h-0 sm:w-auto"
        >
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Enviar — {title}
        </button>
      </div>
    </form>
  );
}
