"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { cpfCnpjDigits, formatCpfCnpj } from "@/lib/br-input-masks";
import { formatMoney } from "@/lib/utils";

type CatalogProduct = {
  id: string;
  name: string;
  price: number;
  stockQty: number | null;
};

type PixResult = {
  encodedImage: string | null;
  payload: string | null;
};

export function PublicProductStore({
  slug,
  orgName,
  products,
  pixAvailable,
}: {
  slug: string;
  orgName: string;
  products: CatalogProduct[];
  pixAvailable: boolean;
}) {
  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pix, setPix] = useState<PixResult | null>(null);
  const [manageToken, setManageToken] = useState<string | null>(null);
  const [amountTotal, setAmountTotal] = useState<number | null>(null);

  const cartLines = useMemo(
    () =>
      products
        .map((p) => ({
          product: p,
          quantity: qtyById[p.id] ?? 0,
        }))
        .filter((l) => l.quantity > 0),
    [products, qtyById],
  );

  const total = cartLines.reduce(
    (s, l) => s + l.product.price * l.quantity,
    0,
  );

  function setQty(productId: string, next: number) {
    setQtyById((prev) => {
      const copy = { ...prev };
      if (next <= 0) delete copy[productId];
      else copy[productId] = next;
      return copy;
    });
  }

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    if (!pixAvailable) {
      setError("PIX online ainda não está disponível nesta barbearia.");
      return;
    }
    if (cartLines.length === 0) {
      setError("Escolha ao menos um produto.");
      return;
    }
    setBusy(true);
    setError(null);
    setPix(null);
    try {
      const res = await fetch(
        `/api/public/org/${encodeURIComponent(slug)}/product-sales/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientName: clientName.trim(),
            clientPhone: clientPhone.trim(),
            clientEmail: clientEmail.trim() || undefined,
            ...(cpf.trim() ? { cpfCnpj: cpfCnpjDigits(cpf) } : {}),
            lines: cartLines.map((l) => ({
              productId: l.product.id,
              quantity: l.quantity,
            })),
          }),
        },
      );
      const data = (await res.json()) as {
        message?: string;
        manageToken?: string;
        amountTotal?: number;
        pix?: { encodedImage?: string | null; payload?: string | null };
      };
      if (!res.ok) {
        setError(data.message ?? "Não foi possível gerar o PIX.");
        return;
      }
      setManageToken(data.manageToken ?? null);
      setAmountTotal(data.amountTotal ?? total);
      setPix({
        encodedImage: data.pix?.encodedImage ?? null,
        payload: data.pix?.payload ?? null,
      });
      setQtyById({});
    } catch {
      setError("Erro de rede.");
    } finally {
      setBusy(false);
    }
  }

  if (products.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-400">
        Nenhum produto disponível no momento. Volte em breve ou fale com{" "}
        {orgName} no balcão.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <ul className="grid gap-3 sm:grid-cols-2">
        {products.map((p) => {
          const qty = qtyById[p.id] ?? 0;
          return (
            <li
              key={p.id}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div>
                <p className="font-medium text-zinc-100">{p.name}</p>
                <p className="mt-1 text-sm text-brand-200">
                  {formatMoney(p.price)}
                </p>
                {p.stockQty != null ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    {p.stockQty} em estoque
                  </p>
                ) : null}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  className="h-9 w-9 rounded-full border border-white/15 text-zinc-200"
                  onClick={() => setQty(p.id, Math.max(0, qty - 1))}
                  aria-label="Diminuir"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm text-zinc-100">
                  {qty}
                </span>
                <button
                  type="button"
                  className="h-9 w-9 rounded-full border border-white/15 text-zinc-200"
                  onClick={() => {
                    const max = p.stockQty ?? 99;
                    setQty(p.id, Math.min(max, qty + 1));
                  }}
                  aria-label="Aumentar"
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <form
        onSubmit={(e) => void checkout(e)}
        className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Checkout PIX</h2>
            <p className="text-xs text-zinc-500">
              {pixAvailable
                ? "Pagamento cai na conta Asaas da barbearia."
                : "PIX online ainda não configurado — compre no balcão."}
            </p>
          </div>
          <p className="text-sm font-semibold text-brand-200">
            Total {formatMoney(total)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 sm:col-span-1">
            <span className="text-xs font-medium text-zinc-400">Seu nome</span>
            <input
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/60"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">WhatsApp</span>
            <input
              required
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/60"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">
              E-mail (opcional)
            </span>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/60"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-400">
              CPF/CNPJ (se o Asaas pedir)
            </span>
            <input
              value={cpf}
              onChange={(e) => setCpf(formatCpfCnpj(e.target.value))}
              inputMode="numeric"
              maxLength={18}
              className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/60"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={busy || !pixAvailable || cartLines.length === 0}
          className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50"
        >
          {busy ? "Gerando PIX…" : "Pagar com PIX"}
        </button>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        {pix ? (
          <div className="space-y-3 border-t border-white/10 pt-4">
            <p className="text-sm text-emerald-300">
              PIX gerado
              {amountTotal != null ? ` · ${formatMoney(amountTotal)}` : ""}.
              Escaneie o QR ou copie o código.
            </p>
            {pix.encodedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${pix.encodedImage}`}
                alt="QR Code PIX"
                className="mx-auto h-44 w-44 rounded-lg bg-white p-2"
              />
            ) : null}
            {pix.payload ? (
              <button
                type="button"
                className="w-full truncate rounded-lg border border-white/10 px-2 py-2 text-left text-xs text-zinc-400"
                onClick={() => void navigator.clipboard.writeText(pix.payload!)}
              >
                Copiar código PIX
              </button>
            ) : null}
            {manageToken ? (
              <p className="text-xs text-zinc-500">
                Acompanhe o status em{" "}
                <Link
                  href={`/${slug}/loja/pedido/${manageToken}`}
                  className="text-brand-200 underline"
                >
                  meu pedido
                </Link>
                .
              </p>
            ) : null}
          </div>
        ) : null}
      </form>
    </div>
  );
}
