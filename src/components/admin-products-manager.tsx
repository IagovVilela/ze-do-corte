"use client";

import { useCallback, useEffect, useState } from "react";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  stockQty: number | null;
};

export function AdminProductsManager() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/products", { credentials: "same-origin" });
      const data = (await res.json()) as { products?: ProductRow[]; message?: string };
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
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-[var(--bn-primary)] px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      {error ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : null}

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
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-[var(--bn-on)]">
                    {row.name}
                    {!row.isActive ? (
                      <span className="ml-2 text-xs text-[var(--bn-muted)]">
                        (inativo)
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[var(--bn-muted)]">
                    R$ {row.price.toFixed(2)}
                    {row.stockQty != null ? ` · estoque ${row.stockQty}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleActive(row)}
                  className="rounded-full border border-[var(--bn-border)] px-3 py-1 text-xs text-[var(--bn-on-variant)]"
                >
                  {row.isActive ? "Desativar" : "Reativar"}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
