"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type OpsUnpaidRow = {
  id: string;
  clientName: string;
  clientPhone: string;
  startsAt: string;
  amount: number;
};

const PAYMENT_METHODS = [
  { value: "PIX", label: "PIX" },
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Cartão", label: "Cartão" },
  { value: "Outro", label: "Outro" },
] as const;

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  unpaid: OpsUnpaidRow[];
  canManagePayment: boolean;
};

export function AdminOpsUnpaidList({ unpaid, canManagePayment }: Props) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [methods, setMethods] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function markPaid(row: OpsUnpaidRow) {
    if (!canManagePayment) return;
    setSavingId(row.id);
    setError(null);
    const method = (methods[row.id] ?? "PIX").trim() || "PIX";
    try {
      const res = await fetch(`/api/admin/appointments/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidAt: new Date().toISOString(),
          paymentMethod: method,
          amountPaid: row.amount,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(data?.message ?? "Não foi possível registrar.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao registrar pagamento.");
    } finally {
      setSavingId(null);
    }
  }

  if (unpaid.length === 0) {
    return (
      <p className="mt-3 text-sm text-[var(--bn-muted)]">Nada pendente.</p>
    );
  }

  return (
    <div className="mt-3">
      {error ? (
        <p className="mb-2 text-xs text-[var(--bn-status-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="divide-y divide-[var(--bn-border)]">
        {unpaid.map((u) => (
          <li key={u.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-[var(--bn-on)]">{u.clientName}</p>
              <p className="text-xs text-[var(--bn-muted)]">
                {u.clientPhone} ·{" "}
                {format(new Date(u.startsAt), "dd/MM", { locale: ptBR })} ·{" "}
                {money(u.amount)}
              </p>
            </div>
            {canManagePayment ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <select
                  className="rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-2 py-1.5 text-xs text-[var(--bn-on)] outline-none focus:border-[var(--bn-primary)]/50 disabled:opacity-50"
                  disabled={savingId === u.id}
                  value={methods[u.id] ?? "PIX"}
                  onChange={(e) =>
                    setMethods((prev) => ({ ...prev, [u.id]: e.target.value }))
                  }
                  aria-label={`Método de pagamento — ${u.clientName}`}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={savingId === u.id}
                  onClick={() => void markPaid(u)}
                  className="rounded-lg bg-emerald-600/85 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                >
                  {savingId === u.id ? "Salvando…" : "Registrar pagamento"}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
