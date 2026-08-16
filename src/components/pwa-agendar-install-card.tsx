"use client";

import { PwaInstallButton } from "@/components/pwa-install-button";
import { usePwaInstall } from "@/hooks/use-pwa-install";

type Props = {
  shopName: string;
};

/** Convite na seção de agendar — só no celular, se o app ainda não estiver instalado. */
export function PwaAgendarInstallCard({ shopName }: Props) {
  const { canOffer, installed } = usePwaInstall();
  if (installed || !canOffer) return null;

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:hidden">
      <p className="text-sm font-semibold text-white">Baixar aplicativo</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
        Coloque a {shopName} na tela inicial do celular para agendar sem abrir o
        navegador.
      </p>
      <div className="mt-3">
        <PwaInstallButton variant="public" />
      </div>
    </div>
  );
}
