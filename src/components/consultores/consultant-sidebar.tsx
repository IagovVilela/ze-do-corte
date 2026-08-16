"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { BarbernegonMark } from "@/components/brand/barbernegon-mark";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/consultores", label: "Chamados", exact: true },
  { href: "/consultores/barbearias", label: "Barbearias" },
] as const;

export function ConsultantSidebar({
  email,
  displayName,
}: {
  email: string;
  displayName: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/consultores/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const label = displayName?.trim() || email.split("@")[0] || "Consultor";

  const links = (
    <>
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-xl px-3 py-2 text-sm font-medium",
              active
                ? "bg-brand-500/20 text-brand-100"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );

  const sairClass =
    "w-full rounded-lg border border-white/15 px-3 py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-50";

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 lg:hidden">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-300">
          Consultores
        </p>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/consultores" className="text-zinc-300">
            Chamados
          </Link>
          <Link href="/consultores/barbearias" className="text-zinc-300">
            Barbearias
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={() => void logout()}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-zinc-100"
          >
            {pending ? "Saindo…" : "Sair"}
          </button>
        </div>
      </header>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/10 bg-[#12171e] lg:flex">
        <div className="border-b border-white/10 px-4 py-4">
          <BarbernegonMark href="/consultores" size={28} withWordmark />
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-300">
            Consultores
          </p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">{links}</nav>
        <div className="mt-auto space-y-2 border-t border-white/10 p-3 pb-16">
          <p className="truncate px-1 text-sm font-medium text-zinc-200">
            {label}
          </p>
          <p className="truncate px-1 text-[11px] text-zinc-500">{email}</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => void logout()}
            className={sairClass}
          >
            {pending ? "Saindo…" : "Sair"}
          </button>
        </div>
      </aside>
    </>
  );
}
