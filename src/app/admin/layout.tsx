import type { ReactNode } from "react";

/** Agrupa rotas públicas de admin (`/admin/login`) e o painel (`(panel)`). */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children;
}
