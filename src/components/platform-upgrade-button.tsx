"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SAAS_PLANS, type SaasPlanId } from "@/lib/asaas-plans";
import { formatMoney } from "@/lib/utils";

type PixPayload = {
  encodedImage?: string | null;
  payload?: string | null;
  expirationDate?: string | null;
};

export function PlatformUpgradeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [pix, setPix] = useState<PixPayload | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  async function subscribe(planId: SaasPlanId) {
    setLoading(true);
    setMessage("");
    setPix(null);
    setInvoiceUrl(null);
    try {
      const res = await fetch("/api/platform/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          ...(cpfCnpj.trim() ? { cpfCnpj: cpfCnpj.trim() } : {}),
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        invoiceUrl?: string | null;
        pix?: PixPayload | null;
      };
      setMessage(data.message ?? (res.ok ? "Ok." : "Falha."));
      if (res.ok) {
        setPix(data.pix ?? null);
        setInvoiceUrl(data.invoiceUrl ?? null);
        router.refresh();
      }
    } catch {
      setMessage("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block space-y-1.5 text-sm">
        <span className="text-zinc-400">CPF/CNPJ do responsável (Asaas)</span>
        <input
          value={cpfCnpj}
          onChange={(e) => setCpfCnpj(e.target.value)}
          placeholder="Somente números"
          className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand-500/60"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {SAAS_PLANS.map((plan) => (
          <button
            key={plan.id}
            type="button"
            disabled={loading}
            onClick={() => void subscribe(plan.id)}
            className={
              plan.id === "pro"
                ? "rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
                : "rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-60"
            }
          >
            {loading
              ? "Gerando…"
              : `Assinar ${plan.name} (${formatMoney(plan.priceMonthly)}/mês)`}
          </button>
        ))}
      </div>

      {message ? <p className="text-xs text-zinc-400">{message}</p> : null}

      {invoiceUrl ? (
        <a
          href={invoiceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-sm text-brand-200 underline"
        >
          Abrir fatura Asaas
        </a>
      ) : null}

      {pix?.encodedImage ? (
        <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-sm text-zinc-300">PIX para ativar o plano</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${pix.encodedImage}`}
            alt="QR Code PIX"
            className="mx-auto h-44 w-44 rounded-lg bg-white p-2"
          />
          {pix.payload ? <CopyPixPayload payload={pix.payload} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function CopyPixPayload({ payload }: { payload: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="w-full truncate rounded-lg border border-white/10 px-3 py-2 text-left text-xs text-zinc-400 hover:bg-white/5"
      onClick={async () => {
        await navigator.clipboard.writeText(payload);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copiado!" : payload}
    </button>
  );
}
