"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const ALLOWED = [
  "/admin",
  "/admin/operacional",
  "/admin/avaliacoes",
  "/admin/agendamentos",
  "/admin/clientes",
  "/admin/clube",
  "/admin/site",
  "/admin/whatsapp",
];

function isAllowed(pathname: string): boolean {
  return ALLOWED.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );
}

export function SupportAssistRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isAllowed(pathname)) {
      router.replace("/admin");
    }
  }, [pathname, router]);

  return null;
}
