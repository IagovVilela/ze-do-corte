"use client";

import Link from "next/link";
import { useState } from "react";

import {
  cpfCnpjDigits,
  formatBrPhoneNational,
  formatCpfCnpj,
} from "@/lib/br-input-masks";
import { cn, formatMoney } from "@/lib/utils";

export type PublicClubPlan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceLabel: string;
  cycleDays: number;
  visitsIncluded: number | null;
  services: string[];
};

type PixPayload = {
  encodedImage?: string | null;
  payload?: string | null;
};

export function ClubPublicJoin({
  slug,
  orgName,
  plans,
  bookHref,
}: {
  slug: string;
  orgName: string;
  plans: PublicClubPlan[];
  bookHref: string;
}) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pix, setPix] = useState<PixPayload | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  const selected = plans.find((p) => p.id === planId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setPix(null);
    setInvoiceUrl(null);

    const digits = cpfCnpjDigits(cpf);
    if (digits.length !== 11 && digits.length !== 14) {
      setError("Informe um CPF ou CNPJ válido.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/public/club/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          clientName: name,
          clientPhone: phone,
          clientEmail: email.trim() || undefined,
          clientCpfCnpj: digits,
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        pix?: PixPayload | null;
        invoiceUrl?: string | null;
        bookHref?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "Não foi possível assinar.");
        return;
      }
      setMessage(
        data.message ??
          "PIX gerado. Depois de pagar, use o mesmo telefone no agendamento.",
      );
      setPix(data.pix ?? null);
      setInvoiceUrl(data.invoiceUrl ?? null);
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  if (plans.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        Nenhum plano do clube disponível no momento.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <ul className="grid gap-3">
        {plans.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setPlanId(p.id)}
              className={cn(
                "w-full rounded-2xl border px-4 py-4 text-left transition",
                planId === p.id
                  ? "border-brand-500/50 bg-brand-500/10"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/5",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{p.name}</p>
                  {p.description ? (
                    <p className="mt-1 text-xs text-zinc-500">{p.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-zinc-400">
                    A cada {p.cycleDays} dias
                    {p.visitsIncluded != null
                      ? ` · ${p.visitsIncluded} visita(s)`
                      : " · visitas ilimitadas nos serviços do plano"}
                  </p>
                  {p.services.length > 0 ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      Inclui: {p.services.join(", ")}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 text-lg font-bold text-brand-200">
                  {formatMoney(p.price)}
                  <span className="text-xs font-medium text-zinc-500">
                    /ciclo
                  </span>
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      >
        <p className="text-sm font-medium text-zinc-200">
          Seus dados · {orgName}
        </p>
        <p className="text-xs text-zinc-500">
          Use o mesmo telefone no agendamento para o crédito valer. CPF é
          exigido pelo PIX.
        </p>
        <input
          required
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
        <input
          required
          type="tel"
          inputMode="tel"
          placeholder="(11) 99999-0000"
          value={phone}
          onChange={(e) => setPhone(formatBrPhoneNational(e.target.value))}
          className={inputClass}
        />
        <input
          type="email"
          placeholder="E-mail (opcional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          required
          inputMode="numeric"
          placeholder="CPF ou CNPJ"
          value={cpf}
          onChange={(e) => setCpf(formatCpfCnpj(e.target.value))}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={loading || !selected}
          className="w-full rounded-full bg-brand-400 px-4 py-3 text-sm font-bold text-zinc-950 disabled:opacity-60"
        >
          {loading
            ? "Gerando PIX…"
            : selected
              ? `Assinar ${selected.name} · ${selected.priceLabel}`
              : "Assinar"}
        </button>
      </form>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-200">{message}</p> : null}

      {invoiceUrl ? (
        <a
          href={invoiceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-100"
        >
          Abrir fatura Asaas
        </a>
      ) : null}

      {pix?.encodedImage ? (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-5 text-center">
          <p className="text-sm text-zinc-300">Pague o PIX para ativar</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${pix.encodedImage}`}
            alt="QR Code PIX do clube"
            className="mx-auto h-48 w-48 rounded-lg bg-white p-2"
          />
          {pix.payload ? (
            <button
              type="button"
              className="w-full truncate rounded-lg border border-white/10 px-3 py-2 text-left text-xs text-zinc-400 hover:bg-white/5"
              onClick={() => void navigator.clipboard.writeText(pix.payload!)}
            >
              Copiar código PIX
            </button>
          ) : null}
          <Link
            href={bookHref}
            className="inline-block text-sm text-brand-200 underline"
          >
            Ir para agendar (depois de pagar)
          </Link>
        </div>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950/50 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-brand-500/60";
