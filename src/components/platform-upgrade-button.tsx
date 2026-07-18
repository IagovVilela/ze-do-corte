"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SAAS_PLANS, type SaasPlanId } from "@/lib/asaas-plans";
import { cpfCnpjDigits, formatCpfCnpj } from "@/lib/br-input-masks";
import { formatMoney } from "@/lib/utils";

export type SaasBillingType = "PIX" | "CREDIT_CARD";

/** Lembra o método na mesma aba (desfazer cancelamento). */
export const SAAS_BILLING_TYPE_STORAGE_KEY = "bn_saas_billing_type";

type PixPayload = {
  encodedImage?: string | null;
  payload?: string | null;
  expirationDate?: string | null;
};

function readStoredBillingType(): SaasBillingType {
  if (typeof window === "undefined") return "PIX";
  try {
    const v = sessionStorage.getItem(SAAS_BILLING_TYPE_STORAGE_KEY);
    if (v === "CREDIT_CARD" || v === "PIX") return v;
  } catch {
    /* ignore */
  }
  return "PIX";
}

function storeBillingType(type: SaasBillingType) {
  try {
    sessionStorage.setItem(SAAS_BILLING_TYPE_STORAGE_KEY, type);
  } catch {
    /* ignore */
  }
}

export function PlatformUpgradeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [billingType, setBillingType] = useState<SaasBillingType>("PIX");
  const [pix, setPix] = useState<PixPayload | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  async function subscribe(planId: SaasPlanId) {
    const digits = cpfCnpjDigits(cpfCnpj);
    if (digits.length !== 11 && digits.length !== 14) {
      setMessage(
        "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) antes de assinar.",
      );
      return;
    }
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
          cpfCnpj: digits,
          billingType,
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        invoiceUrl?: string | null;
        pix?: PixPayload | null;
        billingType?: SaasBillingType;
      };
      setMessage(data.message ?? (res.ok ? "Ok." : "Falha."));
      if (res.ok) {
        storeBillingType(data.billingType ?? billingType);
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
      <fieldset className="space-y-2">
        <legend className="text-sm text-[var(--bn-muted)]">Forma de pagamento</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label
            className={
              billingType === "PIX"
                ? "cursor-pointer rounded-xl border border-brand-500/50 bg-brand-500/10 px-3 py-3"
                : "cursor-pointer rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 px-3 py-3 hover:bg-[var(--bn-hover)]"
            }
          >
            <input
              type="radio"
              name="saas-billing"
              className="sr-only"
              checked={billingType === "PIX"}
              onChange={() => {
                setBillingType("PIX");
                storeBillingType("PIX");
              }}
            />
            <span className="block text-sm font-semibold text-[var(--bn-on)]">
              PIX
            </span>
            <span className="mt-0.5 block text-xs text-[var(--bn-muted)]">
              Você paga a fatura todo mês (como hoje)
            </span>
          </label>
          <label
            className={
              billingType === "CREDIT_CARD"
                ? "cursor-pointer rounded-xl border border-brand-500/50 bg-brand-500/10 px-3 py-3"
                : "cursor-pointer rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/40 px-3 py-3 hover:bg-[var(--bn-hover)]"
            }
          >
            <input
              type="radio"
              name="saas-billing"
              className="sr-only"
              checked={billingType === "CREDIT_CARD"}
              onChange={() => {
                setBillingType("CREDIT_CARD");
                storeBillingType("CREDIT_CARD");
              }}
            />
            <span className="block text-sm font-semibold text-[var(--bn-on)]">
              Cartão de crédito
            </span>
            <span className="mt-0.5 block text-xs text-[var(--bn-muted)]">
              Cobrança automática todo mês após cadastrar o cartão
            </span>
          </label>
        </div>
      </fieldset>

      <label className="block space-y-1.5 text-sm">
        <span className="text-[var(--bn-muted)]">CPF/CNPJ do responsável (Asaas)</span>
        <input
          value={cpfCnpj}
          onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
          placeholder="000.000.000-00"
          inputMode="numeric"
          autoComplete="off"
          className="w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-4 py-2.5 text-sm text-[var(--bn-on)] outline-none focus:border-brand-500/60"
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
                : "rounded-full border border-[var(--bn-border)] px-4 py-2 text-sm text-[var(--bn-on-variant)] transition hover:bg-[var(--bn-hover)] disabled:opacity-60"
            }
          >
            {loading
              ? "Gerando…"
              : `Assinar ${plan.name} (${formatMoney(plan.priceMonthly)}/mês)`}
          </button>
        ))}
      </div>

      {message ? <p className="text-xs text-[var(--bn-muted)]">{message}</p> : null}

      {invoiceUrl ? (
        <a
          href={invoiceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-[var(--bn-primary)] hover:bg-[var(--bn-primary-container)]/15"
        >
          {billingType === "CREDIT_CARD"
            ? "Abrir fatura Asaas e cadastrar cartão"
            : "Abrir fatura Asaas"}
        </a>
      ) : null}

      {billingType === "PIX" && pix?.encodedImage ? (
        <div className="space-y-2 rounded-xl border border-[var(--bn-border)] bg-black/30 p-4">
          <p className="text-sm text-[var(--bn-on-variant)]">PIX para ativar o plano</p>
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

/** Usado pelo botão de desfazer cancelamento. */
export function getStoredSaasBillingType(): SaasBillingType {
  return readStoredBillingType();
}

function CopyPixPayload({ payload }: { payload: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="w-full truncate rounded-lg border border-[var(--bn-border)] px-3 py-2 text-left text-xs text-[var(--bn-muted)] hover:bg-[var(--bn-hover)]"
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
