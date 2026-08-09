"use client";

import { Check, Copy, LoaderCircle, MessageCircle, Sparkles } from "lucide-react";
import { useState } from "react";

import { phoneToWhatsAppHref } from "@/lib/phone-to-whatsapp-link";
import { cn } from "@/lib/utils";
import type { WhatsAppDraftKind } from "@/lib/whatsapp-draft-types";

type Props = {
  kind: WhatsAppDraftKind;
  /** Nome completo ou primeiro nome — enviamos só o primeiro token à API. */
  clientName: string;
  phone: string;
  daysSinceLastActivity?: number | null;
  planName?: string | null;
  lastServiceHint?: string | null;
  className?: string;
  /** rótulo do botão principal */
  label?: string;
  size?: "sm" | "md";
  /** Se true, mostra painel com variantes / copiar após gerar. */
  showPreview?: boolean;
};

export function AdminWhatsAppDraftButton({
  kind,
  clientName,
  phone,
  daysSinceLastActivity,
  planName,
  lastServiceHint,
  className,
  label = "Gerar mensagem",
  size = "sm",
  showPreview = true,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [variants, setVariants] = useState<string[]>([]);
  const [source, setSource] = useState<"llm" | "rules" | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true);
    setError(null);
    const firstName = clientName.trim().split(/\s+/)[0] || "tudo bem";
    try {
      const res = await fetch("/api/admin/ai/whatsapp-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          firstName,
          daysSinceLastActivity: daysSinceLastActivity ?? null,
          planName: planName ?? null,
          lastServiceHint: lastServiceHint ?? null,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        draft?: {
          message?: string;
          variants?: string[];
          source?: "llm" | "rules";
        };
      } | null;
      if (!res.ok) {
        throw new Error(data?.message ?? "Não foi possível gerar.");
      }
      const text = data?.draft?.message?.trim();
      if (!text) throw new Error("Mensagem vazia.");

      setMessage(text);
      setVariants(
        Array.isArray(data?.draft?.variants)
          ? data.draft.variants.filter(Boolean)
          : [],
      );
      setSource(data?.draft?.source ?? null);

      if (!showPreview) {
        const href = phoneToWhatsAppHref(phone, text);
        if (href) {
          window.open(href, "_blank", "noopener,noreferrer");
        } else {
          await copyText(text);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar.");
    } finally {
      setBusy(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copie a mensagem:", text);
    }
  }

  function openWhatsApp(text: string) {
    const href = phoneToWhatsAppHref(phone, text);
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      void copyText(text);
    }
  }

  const pad =
    size === "md"
      ? "min-h-9 gap-1.5 px-3 text-xs"
      : "min-h-8 gap-1 px-2.5 text-[11px]";

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void generate()}
        className={cn(
          "inline-flex w-fit items-center justify-center rounded-lg border border-[var(--bn-primary)]/40 bg-[var(--bn-primary)]/10 font-semibold text-[var(--bn-primary)] transition hover:bg-[var(--bn-primary)]/20 disabled:opacity-50",
          pad,
        )}
      >
        {busy ? (
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="size-3.5" aria-hidden />
        )}
        {busy ? "Gerando…" : message ? "Gerar outra" : label}
      </button>

      {error ? (
        <span className="text-[10px] text-[var(--bn-status-danger)]">
          {error}
        </span>
      ) : null}

      {showPreview && message ? (
        <div className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)]/50 p-3">
          <p className="text-xs leading-relaxed text-[var(--bn-on)] whitespace-pre-wrap">
            {message}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openWhatsApp(message)}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--bn-primary)] px-2.5 py-1.5 text-[11px] font-semibold text-zinc-950"
            >
              <MessageCircle className="size-3.5" aria-hidden />
              Abrir WhatsApp
            </button>
            <button
              type="button"
              onClick={() => void copyText(message)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--bn-border)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--bn-on)] hover:bg-[var(--bn-hover)]"
            >
              {copied ? (
                <Check className="size-3.5 text-emerald-500" aria-hidden />
              ) : (
                <Copy className="size-3.5" aria-hidden />
              )}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          {variants.length > 0 ? (
            <div className="mt-3 space-y-2 border-t border-[var(--bn-border)] pt-2">
              <p className="text-[10px] font-semibold tracking-wide text-[var(--bn-muted)] uppercase">
                Variantes
              </p>
              {variants.map((v) => (
                <div
                  key={v}
                  className="flex flex-col gap-1.5 rounded-lg border border-[var(--bn-border)]/70 px-2.5 py-2"
                >
                  <p className="text-[11px] leading-relaxed text-[var(--bn-on-variant)]">
                    {v}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openWhatsApp(v)}
                      className="text-[10px] font-semibold text-[var(--bn-primary)] hover:underline"
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMessage(v);
                        void copyText(v);
                      }}
                      className="text-[10px] font-semibold text-[var(--bn-muted)] hover:underline"
                    >
                      Usar esta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {source ? (
            <p className="mt-2 text-[10px] text-[var(--bn-muted)]">
              Fonte: {source === "llm" ? "IA" : "modelo pronto"}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
