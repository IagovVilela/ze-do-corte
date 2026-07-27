"use client";

import { useCallback, useEffect, useState } from "react";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  stockQty: number | null;
  stockMin: number | null;
};

function isLowStock(row: ProductRow): boolean {
  if (row.stockQty == null) return false;
  return row.stockQty <= (row.stockMin ?? 3);
}

export function AdminProductsManager() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [stockMin, setStockMin] = useState("");
  const [busy, setBusy] = useState(false);
  const [stockEditId, setStockEditId] = useState<string | null>(null);
  const [stockKind, setStockKind] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [stockQtyInput, setStockQtyInput] = useState("");
  const [stockNote, setStockNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/products", {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        products?: ProductRow[];
        message?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "Falha ao carregar.");
        return;
      }
      setRows(data.products ?? []);
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          price: Number(price.replace(",", ".")),
          stockQty: stock.trim() === "" ? null : Number(stock),
          stockMin: stockMin.trim() === "" ? null : Number(stockMin),
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Não foi possível criar.");
        return;
      }
      setName("");
      setPrice("");
      setStock("");
      setStockMin("");
      await load();
    } catch {
      setError("Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: ProductRow) {
    await fetch(`/api/admin/products/${row.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !row.isActive }),
    });
    await load();
  }

  async function saveMin(row: ProductRow, value: string) {
    const stockMinNext = value.trim() === "" ? null : Number(value);
    if (stockMinNext != null && (!Number.isFinite(stockMinNext) || stockMinNext < 0)) {
      setError("Mínimo inválido.");
      return;
    }
    await fetch(`/api/admin/products/${row.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockMin: stockMinNext }),
    });
    await load();
  }

  async function applyStockMove(productId: string) {
    const qty = Number(stockQtyInput);
    if (!Number.isFinite(qty) || qty < 0 || (stockKind !== "ADJUST" && qty < 1)) {
      setError("Quantidade inválida.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${productId}/stock`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: stockKind,
          quantity: qty,
          note: stockNote.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Falha no movimento de estoque.");
        return;
      }
      setStockEditId(null);
      setStockQtyInput("");
      setStockNote("");
      await load();
    } catch {
      setError("Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => void createProduct(e)}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-4"
      >
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-[var(--bn-muted)]">
          Nome
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-sm text-[var(--bn-on)]"
          />
        </label>
        <label className="flex w-28 flex-col gap-1 text-xs text-[var(--bn-muted)]">
          Preço
          <input
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-sm text-[var(--bn-on)]"
          />
        </label>
        <label className="flex w-28 flex-col gap-1 text-xs text-[var(--bn-muted)]">
          Estoque
          <input
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="opcional"
            className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-sm text-[var(--bn-on)]"
          />
        </label>
        <label className="flex w-28 flex-col gap-1 text-xs text-[var(--bn-muted)]">
          Mínimo
          <input
            value={stockMin}
            onChange={(e) => setStockMin(e.target.value)}
            placeholder="alerta"
            className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-sm text-[var(--bn-on)]"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-[var(--bn-primary)] px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-[var(--bn-muted)]">Carregando…</p>
      ) : (
        <ul className="divide-y divide-[var(--bn-border)] rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)]">
          {rows.length === 0 ? (
            <li className="px-4 py-6 text-sm text-[var(--bn-muted)]">
              Nenhum produto cadastrado.
            </li>
          ) : (
            rows.map((row) => (
              <li key={row.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--bn-on)]">
                      {row.name}
                      {!row.isActive ? (
                        <span className="ml-2 text-xs text-[var(--bn-muted)]">
                          (inativo)
                        </span>
                      ) : null}
                      {isLowStock(row) ? (
                        <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          Estoque baixo
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-[var(--bn-muted)]">
                      R$ {row.price.toFixed(2)}
                      {row.stockQty != null
                        ? ` · estoque ${row.stockQty}`
                        : " · sem controle"}
                      {row.stockMin != null ? ` · mín. ${row.stockMin}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.stockQty != null ? (
                      <button
                        type="button"
                        onClick={() => {
                          setStockEditId(
                            stockEditId === row.id ? null : row.id,
                          );
                          setStockKind("IN");
                          setStockQtyInput("");
                        }}
                        className="rounded-full border border-[var(--bn-border)] px-3 py-1 text-xs text-[var(--bn-on-variant)]"
                      >
                        Movimentar
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void toggleActive(row)}
                      className="rounded-full border border-[var(--bn-border)] px-3 py-1 text-xs text-[var(--bn-on-variant)]"
                    >
                      {row.isActive ? "Desativar" : "Reativar"}
                    </button>
                  </div>
                </div>

                {stockEditId === row.id ? (
                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] p-3">
                    <label className="flex flex-col gap-1 text-[11px] text-[var(--bn-muted)]">
                      Tipo
                      <select
                        value={stockKind}
                        onChange={(e) =>
                          setStockKind(e.target.value as typeof stockKind)
                        }
                        className="rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface)] px-2 py-1.5 text-sm text-[var(--bn-on)]"
                      >
                        <option value="IN">Entrada</option>
                        <option value="OUT">Saída</option>
                        <option value="ADJUST">Ajuste (saldo final)</option>
                      </select>
                    </label>
                    <label className="flex w-24 flex-col gap-1 text-[11px] text-[var(--bn-muted)]">
                      Qtd
                      <input
                        value={stockQtyInput}
                        onChange={(e) => setStockQtyInput(e.target.value)}
                        className="rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface)] px-2 py-1.5 text-sm text-[var(--bn-on)]"
                      />
                    </label>
                    <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-[11px] text-[var(--bn-muted)]">
                      Motivo
                      <input
                        value={stockNote}
                        onChange={(e) => setStockNote(e.target.value)}
                        className="rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface)] px-2 py-1.5 text-sm text-[var(--bn-on)]"
                      />
                    </label>
                    <label className="flex w-24 flex-col gap-1 text-[11px] text-[var(--bn-muted)]">
                      Mínimo
                      <input
                        defaultValue={row.stockMin ?? ""}
                        onBlur={(e) => void saveMin(row, e.target.value)}
                        placeholder="alerta"
                        className="rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface)] px-2 py-1.5 text-sm text-[var(--bn-on)]"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void applyStockMove(row.id)}
                      className="rounded-lg bg-[var(--bn-primary)] px-3 py-1.5 text-xs font-semibold text-zinc-950 disabled:opacity-50"
                    >
                      Aplicar
                    </button>
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
