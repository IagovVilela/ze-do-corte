import type { ReactNode } from "react";

/** Agrupa rotas públicas de admin (`/admin/login`, esqueci/redefinir senha) e o painel (`(panel)`). */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children;
}
