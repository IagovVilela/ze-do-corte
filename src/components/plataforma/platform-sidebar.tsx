"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

import { BarbernegonMark } from "@/components/brand/barbernegon-mark";
import { PLATFORM_SUPPORT_DISPLAY_NAME } from "@/lib/support";
import { publicSurfaceUrl } from "@/lib/public-hosts";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/plataforma", label: "Visão geral", exact: true },
  { href: "/plataforma/barbearias", label: "Barbearias" },
  { href: "/plataforma/marketplace", label: "Marketplace" },
  { href: "/plataforma/consumidores", label: "Consumidores" },
  { href: "/plataforma/suporte", label: "Suporte" },
] as const;

const SEEN_TICKETS_KEY = "bn-ops-support-seen-ids";
const POLL_MS = 15_000;

type TicketPulse = {
  id: string;
  subject: string;
  organizationName: string;
};

type ToastState = {
  subject: string;
  organizationName: string;
  count: number;
} | null;

function readSeenIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_TICKETS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeSeenIds(ids: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_TICKETS_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore quota */
  }
}

export function PlatformSidebar({
  email,
  displayName = PLATFORM_SUPPORT_DISPLAY_NAME,
}: {
  email: string;
  displayName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [toast, setToast] = useState<ToastState>(null);
  const primedRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/platform/support/tickets?status=OPEN", {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          tickets?: Array<{
            id: string;
            subject: string;
            organization?: { name?: string } | null;
          }>;
        };
        const tickets: TicketPulse[] = (data.tickets ?? []).map((t) => ({
          id: t.id,
          subject: t.subject,
          organizationName: t.organization?.name?.trim() || "Barbearia",
        }));
        if (cancelled) return;

        setOpenCount(tickets.length);

        const seen = readSeenIds();
        if (!primedRef.current) {
          primedRef.current = true;
          writeSeenIds(new Set(tickets.map((t) => t.id)));
          return;
        }

        const fresh = tickets.filter((t) => !seen.has(t.id));
        if (fresh.length === 0) return;

        for (const t of fresh) seen.add(t.id);
        writeSeenIds(seen);

        const latest = fresh[0]!;
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({
          subject: latest.subject,
          organizationName: latest.organizationName,
          count: fresh.length,
        });
        toastTimerRef.current = setTimeout(() => setToast(null), 8_000);

        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification("Novo chamado — Barbernegon", {
              body:
                fresh.length === 1
                  ? `${latest.organizationName}: ${latest.subject}`
                  : `${fresh.length} chamados novos`,
              tag: `bn-support-${latest.id}`,
            });
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* rede / 503 — silencioso */
      }
    }

    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function enableBrowserNotify() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") return;
    if (Notification.permission === "denied") return;
    await Notification.requestPermission();
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
            const isSupport = item.href === "/plataforma/suporte";
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-brand-500/20 text-brand-200 ring-1 ring-brand-500/40"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
                  )}
                >
                  <span>{item.label}</span>
                  {isSupport && openCount > 0 ? (
                    <span className="min-w-5 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-center text-[10px] font-bold text-zinc-950">
                      {openCount > 99 ? "99+" : openCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto space-y-2 border-t border-white/10 p-4">
        <p className="truncate text-sm font-medium text-zinc-200">
          {displayName}
        </p>
        <p className="truncate text-[11px] text-zinc-600">{email}</p>
        <button
          type="button"
          onClick={() => void enableBrowserNotify()}
          className="block text-left text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
        >
          Ativar alerta no navegador
        </button>
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
        {openCount > 0 ? (
          <Link
            href="/plataforma/suporte"
            className="ml-auto rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-zinc-950"
          >
            {openCount} aberto{openCount === 1 ? "" : "s"}
          </Link>
        ) : null}
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

      {toast ? (
        <div
          className="fixed right-4 bottom-4 z-[60] max-w-sm rounded-xl border border-amber-500/40 bg-[#161b22] px-4 py-3 shadow-xl shadow-black/40"
          role="status"
        >
          <p className="text-xs font-bold tracking-wide text-amber-300 uppercase">
            Novo chamado
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-100">
            {toast.organizationName}
          </p>
          <p className="text-sm text-zinc-400">{toast.subject}</p>
          {toast.count > 1 ? (
            <p className="mt-1 text-xs text-zinc-500">
              +{toast.count - 1} outro{toast.count === 2 ? "" : "s"}
            </p>
          ) : null}
          <Link
            href="/plataforma/suporte"
            className="mt-2 inline-block text-xs font-semibold text-brand-300 hover:text-brand-200"
            onClick={() => setToast(null)}
          >
            Abrir inbox →
          </Link>
        </div>
      ) : null}
    </>
  );
}
