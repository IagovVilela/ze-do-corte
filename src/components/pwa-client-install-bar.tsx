"use client";

import { Download, Share, Smartphone, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { PwaInstallButton } from "@/components/pwa-install-button";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "bn-pwa-install-bar-dismissed";

function CompactCornerButton() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex justify-end px-3 sm:px-5">
      <div className="pointer-events-auto">
        <PwaInstallButton variant="public" />
      </div>
    </div>
  );
}

/**
 * Faixa fixa no celular: baixar o app do salão (site e agendar).
 * Some se já estiver instalado; se o cliente fechar, fica o botão compacto.
 */
export function PwaClientInstallBar() {
  const { installed, busy, deferred, iosEligible, canOffer, mobile, install } =
    usePwaInstall();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const hintId = useId();

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (installed || !canOffer) return null;
  if (dismissed === null) return null;
  if (!mobile || dismissed) return <CompactCornerButton />;

  async function onDownload() {
    if (deferred) {
      await install();
      return;
    }
    setHintOpen((v) => !v);
  }

  function dismiss() {
    setDismissed(true);
    setHintOpen(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <div className="h-[4.75rem] md:hidden" aria-hidden />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_-16px_rgba(0,0,0,0.65)] backdrop-blur-md md:hidden",
        )}
      >
        {hintOpen && !deferred ? (
          <p
            id={hintId}
            role="status"
            className="border-b border-white/10 px-4 py-2.5 text-[12px] leading-relaxed text-zinc-300"
          >
            {iosEligible ? (
              <>
                Toque em{" "}
                <Share className="mx-0.5 inline size-3.5 align-text-bottom" aria-hidden />{" "}
                <strong className="text-white">Compartilhar</strong> e depois em{" "}
                <strong className="text-white">Adicionar à Tela de Início</strong>.
              </>
            ) : (
              <>
                Abra o menu do navegador{" "}
                <Smartphone className="mx-0.5 inline size-3.5 align-text-bottom" aria-hidden />{" "}
                <strong className="text-white">(⋮)</strong> e escolha{" "}
                <strong className="text-white">Instalar app</strong> ou{" "}
                <strong className="text-white">Adicionar à tela inicial</strong>.
              </>
            )}
          </p>
        ) : null}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
            <Download className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Baixar aplicativo</p>
            <p className="truncate text-[11px] text-zinc-400">
              Agende pela tela inicial do celular
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDownload()}
            aria-describedby={hintOpen ? hintId : undefined}
            className="min-h-11 shrink-0 rounded-full bg-brand-500 px-3.5 text-xs font-semibold text-zinc-950 transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Instalando…" : "Baixar"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fechar convite para baixar o aplicativo"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </>
  );
}
