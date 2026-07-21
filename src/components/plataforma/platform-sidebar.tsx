"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { BarbernegonMark } from "@/components/brand/barbernegon-mark";
import { publicSurfaceUrl } from "@/lib/public-hosts";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/plataforma", label: "Visão geral", exact: true },
  { href: "/plataforma/barbearias", label: "Barbearias" },
  { href: "/plataforma/marketplace", label: "Marketplace" },
  { href: "/plataforma/consumidores", label: "Consumidores" },
] as const;

export function PlatformSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const body = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-4">
        <BarbernegonMark
          href="/plataforma"
          size={40}
          className="text-white [&_span]:text-base"
        />
        <button
          type="button"
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Ops">
        <ul className="flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active = isActive(
              item.href,
              "exact" in item ? item.exact : false,
            );
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-brand-500/20 text-brand-200 ring-1 ring-brand-500/40"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto space-y-2 border-t border-white/10 p-4">
        <p className="truncate text-xs text-zinc-500">{email}</p>
        <Link
          href={publicSurfaceUrl("marketplace", "/explorar")}
          className="block text-xs text-zinc-500 hover:text-zinc-300"
        >
          Ver marketplace público
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="w-full rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200"
        >
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#0f1419]/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          className="rounded-lg border border-white/15 p-2 text-zinc-200 hover:bg-white/5"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
        <BarbernegonMark
          href="/plataforma"
          size={32}
          className="pointer-events-none text-white [&_span]:text-sm"
        />
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-white/10 bg-[#0c1016] transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {body}
      </aside>
    </>
  );
}
