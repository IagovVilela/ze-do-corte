"use client";

import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || ios;
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return iOS && webkit && notOther;
}

type Props = {
  /** Visual alinhado ao painel ou ao site público. */
  variant?: "admin" | "public";
  className?: string;
};

/**
 * Mesma opção do painel: instalar como app quando o browser permitir.
 * No iOS Safari mostra o atalho Compartilhar → Adicionar à Tela de Início.
 */
export function PwaInstallButton({ variant = "public", className }: Props) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [iosHintOpen, setIosHintOpen] = useState(false);
  const [iosEligible, setIosEligible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isStandaloneDisplay()) {
      setInstalled(true);
      return;
    }

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          /* ignore */
        });
    }

    if (isIosSafari()) {
      setIosEligible(true);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setIosHintOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!deferred && !iosEligible) return null;

  const isAdmin = variant === "admin";

  async function install() {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("relative inline-flex flex-col items-stretch", className)}>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (deferred) {
            void install();
            return;
          }
          setIosHintOpen((v) => !v);
        }}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-60",
          isAdmin
            ? "border-[var(--bn-border)] text-[var(--bn-on-variant)] hover:bg-[var(--bn-hover)]"
            : "border-white/15 bg-white/[0.06] text-zinc-200 hover:border-brand-400/45 hover:bg-brand-500/10 hover:text-brand-100",
        )}
      >
        <Download className="size-3.5" aria-hidden />
        {busy ? "Instalando…" : "Instalar app"}
      </button>
      {iosHintOpen && iosEligible && !deferred ? (
        <p
          role="status"
          className={cn(
            "absolute bottom-full left-1/2 z-10 mb-2 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border px-3 py-2 text-left text-[11px] leading-relaxed shadow-lg",
            isAdmin
              ? "border-[var(--bn-border)] bg-[var(--bn-surface)] text-[var(--bn-muted)]"
              : "border-white/15 bg-zinc-950 text-zinc-300",
          )}
        >
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
        </p>
      ) : null}
    </div>
  );
}
