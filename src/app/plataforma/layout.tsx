import type { ReactNode } from "react";

/** Layout raiz — login e ops compartilham só o shell HTML pai. */
export default function PlataformaRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
