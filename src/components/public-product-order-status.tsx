"use client";

import { useCallback, useEffect, useState } from "react";

import { formatMoney } from "@/lib/utils";

type SaleView = {
  paymentStatus: string;
  paidAt: string | null;
  amountTotal: number;
  paymentMethod: string | null;
  clientName: string | null;
  items: { productName: string; quantity: number; unitPrice: number }[];
  createdAt: string;
};

export function PublicProductOrderStatus({
  slug,
  token,
}: {
  slug: string;
  token: string;
}) {
  const [sale, setSale] = useState<SaleView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/public/org/${encodeURIComponent(slug)}/product-sales/${encodeURIComponent(token)}`,
      );
      const data = (await res.json()) as {
        sale?: SaleView;
        message?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "Pedido não encontrado.");
        setSale(null);
        return;
      }
      setSale(data.sale ?? null);
      setError(null);
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }, [slug, token]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(id);
  }, [load]);

  if (loading && !sale) {
    return <p className="text-sm text-zinc-400">Carregando pedido…</p>;
  }
  if (error && !sale) {
    return <p className="text-sm text-red-400">{error}</p>;
  }
  if (!sale) return null;

  const paid = sale.paymentStatus === "PAID";

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p
        className={
          paid
            ? "text-sm font-semibold text-emerald-300"
            : sale.paymentStatus === "FAILED"
              ? "text-sm font-semibold text-rose-300"
              : "text-sm font-semibold text-amber-200"
        }
      >
        {paid
          ? "Pagamento confirmado"
          : sale.paymentStatus === "FAILED"
            ? "Pagamento não concluído"
            : "Aguardando PIX"}
      </p>
      <p className="text-2xl font-semibold text-white">
        {formatMoney(sale.amountTotal)}
      </p>
      <ul className="space-y-1 text-sm text-zinc-300">
        {sale.items.map((i, idx) => (
          <li key={`${i.productName}-${idx}`}>
            {i.quantity}× {i.productName} · {formatMoney(i.unitPrice)}
          </li>
        ))}
      </ul>
      {sale.clientName ? (
        <p className="text-xs text-zinc-500">Pedido de {sale.clientName}</p>
      ) : null}
      {!paid && sale.paymentStatus !== "FAILED" ? (
        <p className="text-xs text-zinc-500">
          Esta página atualiza sozinha quando o PIX cair.
        </p>
      ) : null}
    </div>
  );
}
