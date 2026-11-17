"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { formatMoney } from "@/lib/utils";

type CatalogProduct = {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  stockQty: number | null;
};

type SaleRow = {
  id: string;
  channel: "COUNTER" | "ONLINE";
  clientName: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  amountTotal: number;
  createdAt: string;
  items: { productName: string; quantity: number; unitPrice: number }[];
};

const PAYMENT_METHODS = ["Dinheiro", "PIX", "Cartão", "Outro"] as const;

export function AdminProductSalePanel({
  products,
}: {
  products: CatalogProduct[];
}) {
  const active = useMemo(
    () => products.filter((p) => p.isActive),
    [products],
  );
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [cart, setCart] = useState<
    { productId: string; name: string; price: number; quantity: number }[]
  >([]);
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]>("Dinheiro");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [sales, setSales] = useState<SaleRow[]>([]);

  const loadSales = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/product-sales", {
        credentials: "same-origin",
      });
      const data = (await res.json()) as { sales?: SaleRow[]; message?: string };
      if (res.ok) setSales(data.sales ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  useEffect(() => {
    if (!productId && active[0]) setProductId(active[0].id);
  }, [active, productId]);

  function addToCart() {
    const product = active.find((p) => p.id === productId);
    if (!product) return;
    const quantity = Number(qty);
    if (!Number.isInteger(quantity) || quantity < 1) {
      setError("Quantidade inválida.");
      return;
    }
    if (product.stockQty != null && product.stockQty < quantity) {
      setError("Estoque insuficiente.");
      return;
    }
    setError(null);
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        return prev.map((c) =>
          c.productId === product.id
            ? { ...c, quantity: c.quantity + quantity }
            : c,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity,
        },
      ];
    });
    setQty("1");
  }

  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  async function submitSale(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) {
      setError("Adicione produtos à venda.");
      return;
    }
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/admin/product-sales", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          clientName: clientName.trim() || undefined,
          clientPhone: clientPhone.trim() || undefined,
          lines: cart.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
          })),
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Falha ao registrar.");
        return;
      }
      setCart([]);
      setClientName("");
      setClientPhone("");
      setOkMsg("Venda registrada e estoque baixado.");
      await loadSales();
    } catch {
      setError("Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => void submitSale(e)}
        className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-4"
      >
        <h2 className="text-sm font-semibold text-[var(--bn-on)]">
          Venda avulsa no balcão
        </h2>
        <p className="mt-1 text-xs text-[var(--bn-muted)]">
          Sem agendamento: dá baixa no estoque e registra o pagamento.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-[var(--bn-muted)]">
            Produto
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-sm text-[var(--bn-on)]"
            >
              {active.length === 0 ? (
                <option value="">Nenhum produto ativo</option>
              ) : (
                active.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatMoney(p.price)}
                    {p.stockQty != null ? ` · est. ${p.stockQty}` : ""}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="flex w-20 flex-col gap-1 text-xs text-[var(--bn-muted)]">
            Qtd
            <input
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value.replace(/\D/g, "").slice(0, 3))}
              className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-sm text-[var(--bn-on)]"
            />
          </label>
          <button
            type="button"
            onClick={addToCart}
            disabled={!productId}
            className="rounded-xl border border-[var(--bn-border)] px-3 py-2 text-sm text-[var(--bn-on-variant)] disabled:opacity-50"
          >
            Adicionar
          </button>
        </div>

        {cart.length > 0 ? (
          <ul className="mt-3 divide-y divide-[var(--bn-border)] rounded-xl border border-[var(--bn-border)]">
            {cart.map((c) => (
              <li
                key={c.productId}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="text-[var(--bn-on)]">
                  {c.quantity}× {c.name}
                </span>
                <span className="flex items-center gap-2 text-[var(--bn-muted)]">
                  {formatMoney(c.price * c.quantity)}
                  <button
                    type="button"
                    className="text-xs text-rose-300"
                    onClick={() =>
                      setCart((prev) =>
                        prev.filter((x) => x.productId !== c.productId),
                      )
                    }
                  >
                    Remover
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <label className="flex w-36 flex-col gap-1 text-xs text-[var(--bn-muted)]">
            Pagamento
            <select
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as (typeof PAYMENT_METHODS)[number])
              }
              className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-sm text-[var(--bn-on)]"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-[var(--bn-muted)]">
            Cliente (opcional)
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-sm text-[var(--bn-on)]"
            />
          </label>
          <label className="flex w-40 flex-col gap-1 text-xs text-[var(--bn-muted)]">
            Telefone
            <input
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-sm text-[var(--bn-on)]"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--bn-on)]">
            Total {formatMoney(total)}
          </p>
          <button
            type="submit"
            disabled={busy || cart.length === 0}
            className="rounded-xl bg-[var(--bn-primary)] px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            {busy ? "Salvando…" : "Registrar venda"}
          </button>
        </div>

        {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
        {okMsg ? <p className="mt-2 text-sm text-emerald-300">{okMsg}</p> : null}
      </form>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--bn-muted)]">
          Últimas vendas avulsas
        </h3>
        <ul className="mt-2 divide-y divide-[var(--bn-border)] rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)]">
          {sales.length === 0 ? (
            <li className="px-4 py-4 text-sm text-[var(--bn-muted)]">
              Nenhuma venda avulsa ainda.
            </li>
          ) : (
            sales.map((s) => (
              <li key={s.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[var(--bn-on)]">
                    {formatMoney(s.amountTotal)}
                    <span className="ml-2 text-xs font-normal text-[var(--bn-muted)]">
                      {s.channel === "ONLINE" ? "Loja" : "Balcão"}
                      {s.paymentMethod ? ` · ${s.paymentMethod}` : ""}
                      {s.paymentStatus !== "PAID"
                        ? ` · ${s.paymentStatus}`
                        : ""}
                    </span>
                  </p>
                  <span className="text-xs text-[var(--bn-muted)]">
                    {new Date(s.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-xs text-[var(--bn-muted)]">
                  {s.items
                    .map((i) => `${i.quantity}× ${i.productName}`)
                    .join(", ")}
                  {s.clientName ? ` · ${s.clientName}` : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
