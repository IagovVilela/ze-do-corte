"use client";

import { Download, Share, Smartphone } from "lucide-react";
import { useState } from "react";

import { usePwaInstall } from "@/hooks/use-pwa-install";
import { cn } from "@/lib/utils";

type Props = {
  /** Visual alinhado ao painel ou ao site público. */
  variant?: "admin" | "public";
  className?: string;
  /** Texto do botão (público: Baixar aplicativo). */
  label?: string;
};

/**
 * Instalar como app quando o browser permitir.
 * No celular o botão aparece mesmo sem o convite nativo do Chrome
 * (iOS: Compartilhar → Tela de Início; Android: menu Instalar app).
 */
export function PwaInstallButton({ variant = "public", className, label }: Props) {
  const { installed, busy, deferred, iosEligible, canOffer, install } =
    usePwaInstall();
  const [hintOpen, setHintOpen] = useState(false);

  if (installed || !canOffer) return null;

  const isAdmin = variant === "admin";
  const text =
    label ?? (isAdmin ? "Instalar app" : "Baixar aplicativo");

  async function onClick() {
    if (deferred) {
      await install();
      return;
    }
    setHintOpen((v) => !v);
  }

  return (
    <div className={cn("relative inline-flex flex-col items-stretch", className)}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onClick()}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition disabled:opacity-60 sm:min-h-0 sm:py-1.5",
          isAdmin
            ? "border-[var(--bn-border)] text-[var(--bn-on-variant)] hover:bg-[var(--bn-hover)]"
            : "border-white/15 bg-white/[0.06] text-zinc-200 hover:border-brand-400/45 hover:bg-brand-500/10 hover:text-brand-100",
        )}
      >
        <Download className="size-3.5" aria-hidden />
        {busy ? "Instalando…" : text}
      </button>
      {hintOpen && !deferred ? (
        <p
          role="status"
          className={cn(
            "absolute bottom-full left-1/2 z-10 mb-2 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border px-3 py-2 text-left text-[11px] leading-relaxed shadow-lg",
            isAdmin
              ? "border-[var(--bn-border)] bg-[var(--bn-surface)] text-[var(--bn-muted)]"
              : "border-white/15 bg-zinc-950 text-zinc-300",
          )}
        >
          {iosEligible ? (
            <>
              No iPhone/iPad: toque em{" "}
              <Share className="mx-0.5 inline size-3 align-text-bottom" aria-hidden />{" "}
              <strong className={isAdmin ? "text-[var(--bn-on)]" : "text-white"}>
                Compartilhar
              </strong>{" "}
              e depois{" "}
              <strong className={isAdmin ? "text-[var(--bn-on)]" : "text-white"}>
                Adicionar à Tela de Início
              </strong>
              .
            </>
          ) : (
            <>
              No celular: abra o menu do navegador{" "}
              <Smartphone className="mx-0.5 inline size-3 align-text-bottom" aria-hidden />{" "}
              <strong className={isAdmin ? "text-[var(--bn-on)]" : "text-white"}>
                (⋮)
              </strong>{" "}
              e escolha{" "}
              <strong className={isAdmin ? "text-[var(--bn-on)]" : "text-white"}>
                Instalar app
              </strong>{" "}
              ou{" "}
              <strong className={isAdmin ? "text-[var(--bn-on)]" : "text-white"}>
                Adicionar à tela inicial
              </strong>
              .
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}
