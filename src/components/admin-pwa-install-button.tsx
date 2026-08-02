"use client";

import { PwaInstallButton } from "@/components/pwa-install-button";

/**
 * Botão do rodapé do painel — delega ao componente compartilhado de PWA.
 */
export function AdminPwaInstallButton() {
  return <PwaInstallButton variant="admin" />;
}
