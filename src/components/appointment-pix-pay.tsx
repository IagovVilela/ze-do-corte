"use client";

import { useState } from "react";

import { cpfCnpjDigits, formatCpfCnpj } from "@/lib/br-input-masks";

type PixResult = {
  encodedImage: string | null;
  payload: string | null;
};

export function AppointmentPixPay({
  appointmentId,
  manageToken,
  usedClub,
}: {
  appointmentId: string;
  manageToken: string;
  usedClub?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cpf, setCpf] = useState("");
  const [pix, setPix] = useState<PixResult | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  if (usedClub) {
    return (
      <p className="text-sm text-emerald-400">
        Crédito do clube aplicado — sem cobrança neste atendimento.
      </p>
    );
  }

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/pay-pix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manageToken,
          ...(cpf.trim()
            ? { cpfCnpj: cpfCnpjDigits(cpf) }
            : {}),
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        paid?: boolean;
        invoiceUrl?: string | null;
        pix?: { encodedImage?: string | null; payload?: string | null };
      };
      if (data.paid) {
        setPaid(true);
        return;
      }
      if (!res.ok) throw new Error(data.message ?? "Falha ao gerar PIX.");
      setInvoiceUrl(data.invoiceUrl ?? null);
      setPix({
        encodedImage: data.pix?.encodedImage ?? null,
        payload: data.pix?.payload ?? null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }

  if (paid) {
    return <p className="text-sm text-emerald-400">Pagamento já registrado.</p>;
  }

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm font-medium text-zinc-200">Pagar agora com PIX</p>
      <p className="text-xs text-zinc-500">
        Opcional. Você também pode pagar no balcão. CPF pode ser exigido pelo Asaas.
      </p>
      <input
        value={cpf}
        onChange={(e) => setCpf(formatCpfCnpj(e.target.value))}
        placeholder="000.000.000-00"
        inputMode="numeric"
        autoComplete="off"
        className="w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/60"
      />
      <button
        type="button"
        disabled={loading}
        onClick={() => void generate()}
        className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-60"
      >
        {loading ? "Gerando…" : "Gerar PIX"}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {invoiceUrl ? (
        <a
          href={invoiceUrl}
          target="_blank"
          rel="noreferrer"
          className="block text-sm text-brand-200 underline"
        >
          Abrir fatura
        </a>
      ) : null}
      {pix?.encodedImage ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${pix.encodedImage}`}
            alt="QR Code PIX"
            className="mx-auto h-40 w-40 rounded-lg bg-white p-2"
          />
          {pix.payload ? (
            <button
              type="button"
              className="w-full truncate rounded-lg border border-white/10 px-2 py-2 text-left text-xs text-zinc-400"
              onClick={() => void navigator.clipboard.writeText(pix.payload!)}
            >
              Copiar código PIX
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
