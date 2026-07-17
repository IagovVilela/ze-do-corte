"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import type { StaffAccess } from "@/lib/staff-access";
import { cn } from "@/lib/utils";

const roleLabel: Record<StaffAccess["role"], string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  STAFF: "Funcionário",
};

type NavItem = {
  href: string;
  label: string;
  show: boolean;
  /** Ex.: recurso só no Pro */
  badge?: string | null;
};

function sessionDisplayName(access: StaffAccess): string {
  const trimmed = access.displayName?.trim();
  if (trimmed) return trimmed;
  const email = access.email?.trim();
  if (email?.includes("@")) return email.split("@")[0] ?? email;
  if (email) return email;
  return "";
}

export function AdminPanelNav({
  access,
  proUnlocked = true,
}: {
  access: StaffAccess;
  /** Caixa/Clube liberados (trial ou Pro ativo) */
  proUnlocked?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const name = sessionDisplayName(access);
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
    router.push("/admin/login");
    router.refresh();
  }

  const items: NavItem[] = [
    { href: "/admin", label: "Visão geral", show: true },
    { href: "/admin/perfil", label: "Perfil", show: true },
    {
      href: "/admin/expediente",
      label: "Meu expediente",
      show: access.role === "STAFF",
    },
    { href: "/admin/unidades", label: "Unidades", show: access.permissions.manageUnits },
    { href: "/admin/equipe", label: "Equipe", show: access.permissions.manageStaff !== "none" },
    {
      href: "/admin/servicos",
      label: "Serviços",
      show: access.permissions.manageServices,
    },
    {
      href: "/admin/marca",
      label: "Marca",
      show: access.permissions.manageBranding,
    },
    {
      href: "/admin/site",
      label: "Site",
      show: access.permissions.manageBranding,
    },
    {
      href: "/admin/whatsapp",
      label: "WhatsApp",
      show: access.permissions.manageBranding,
    },
    {
      href: "/admin/caixa",
      label: "Caixa",
      show: access.permissions.viewRevenue,
      badge: proUnlocked ? null : "Pro",
    },
    {
      href: "/admin/pagamentos",
      label: "Pagamentos",
      show: access.role === "OWNER" || access.permissions.manageSettings,
    },
    {
      href: "/admin/clube",
      label: "Clube",
      show: access.permissions.manageSubscriptions,
      badge: proUnlocked ? null : "Pro",
    },
    {
      href: "/admin/plano",
      label: "Plano",
      show: access.role === "OWNER",
    },
    {
      href: "/admin/configuracao",
      label: "Configuração",
      show: access.permissions.manageSettings,
    },
  ];

  const visible = items.filter((i) => i.show);

  const sidebarBody = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-4">
        <Link
          href="/admin"
          className="text-base font-semibold tracking-tight text-white"
        >
          Painel
        </Link>
        <button
          type="button"
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-100 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav
        aria-label="Seções do painel"
        className="flex-1 overflow-y-auto px-2 py-3"
      >
        <ul className="flex flex-col gap-0.5">
          {visible.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
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
                  {item.badge ? (
                    <span className="rounded-full bg-brand-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-200">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto space-y-3 border-t border-white/10 p-4">
        <Link
          href="/admin/perfil"
          className="flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-white/5"
          title="Meu perfil"
        >
          <span className="relative block size-9 shrink-0 overflow-hidden rounded-full bg-zinc-700 ring-1 ring-white/10">
            {access.profileImageUrl ? (
              <Image
                src={access.profileImageUrl}
                alt=""
                width={36}
                height={36}
                className="size-9 object-cover"
              />
            ) : (
              <span className="flex size-9 items-center justify-center text-xs font-semibold text-zinc-200">
                {(access.displayName || access.email || "?")
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-zinc-200">
              {name || "Perfil"}
            </span>
            <span className="block truncate text-xs text-zinc-500">
              {roleLabel[access.role]}
            </span>
          </span>
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
      {/* Barra móvel */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#0f1419]/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          className="rounded-lg border border-white/15 p-2 text-zinc-200 hover:bg-white/5"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
        <span className="text-sm font-semibold text-white">Painel</span>
      </div>

      {/* Overlay móvel */}
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-white/10 bg-[#0c1016] transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarBody}
      </aside>
    </>
  );
}
