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
  badge?: string | null;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

function sessionDisplayName(access: StaffAccess): string {
  const trimmed = access.displayName?.trim();
  if (trimmed) return trimmed;
  const email = access.email?.trim();
  if (email?.includes("@")) return email.split("@")[0] ?? email;
  if (email) return email;
  return "";
}

function buildGroups(
  access: StaffAccess,
  proUnlocked: boolean,
): NavGroup[] {
  return [
    {
      id: "overview",
      label: "Visão geral",
      items: [{ href: "/admin", label: "Visão geral", show: true }],
    },
    {
      id: "operation",
      label: "Operação",
      items: [
        {
          href: "/admin/unidades",
          label: "Unidades",
          show: access.permissions.manageUnits,
        },
        {
          href: "/admin/equipe",
          label: "Equipe",
          show: access.permissions.manageStaff !== "none",
        },
        {
          href: "/admin/servicos",
          label: "Serviços",
          show: access.permissions.manageServices,
        },
        {
          href: "/admin/expediente",
          label: "Meu expediente",
          show: access.role === "STAFF",
        },
      ],
    },
    {
      id: "brand",
      label: "Marca & presença",
      items: [
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
      ],
    },
    {
      id: "finance",
      label: "Financeiro",
      items: [
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
      ],
    },
    {
      id: "account",
      label: "Conta",
      items: [
        { href: "/admin/perfil", label: "Perfil", show: true },
        {
          href: "/admin/configuracao",
          label: "Configuração",
          show: access.permissions.manageSettings,
        },
      ],
    },
  ];
}

export function AdminPanelNav({
  access,
  proUnlocked = true,
}: {
  access: StaffAccess;
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

  const groups = buildGroups(access, proUnlocked)
    .map((g) => ({ ...g, items: g.items.filter((i) => i.show) }))
    .filter((g) => g.items.length > 0);

  const sidebarBody = (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--bn-border)] px-4 py-4">
        <Link
          href="/admin"
          className="font-brand-headline text-base font-bold tracking-tight text-[var(--bn-on)]"
        >
          Barbernegon
        </Link>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-lg text-[var(--bn-muted)] transition hover:bg-white/5 hover:text-[var(--bn-on)] lg:hidden"
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
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.id}>
              <p className="mb-1.5 px-3 text-[11px] font-bold tracking-[0.1em] text-[var(--bn-muted)] uppercase">
                {group.label}
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
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
                            ? "bg-[var(--bn-primary-container)]/15 text-[var(--bn-primary)] ring-1 ring-[var(--bn-primary)]/25"
                            : "text-[var(--bn-on-variant)] hover:bg-white/5 hover:text-[var(--bn-on)]",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {active ? (
                            <span
                              aria-hidden
                              className="h-4 w-0.5 rounded-full bg-[var(--bn-primary)]"
                            />
                          ) : null}
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="rounded-md bg-[var(--bn-primary)]/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[var(--bn-primary)] uppercase">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="mt-auto space-y-3 border-t border-[var(--bn-border)] p-4">
        <Link
          href="/admin/perfil"
          className="flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-white/5"
          title="Meu perfil"
        >
          <span className="relative block size-9 shrink-0 overflow-hidden rounded-full bg-[var(--bn-surface-container)] ring-1 ring-[var(--bn-border)]">
            {access.profileImageUrl ? (
              <Image
                src={access.profileImageUrl}
                alt=""
                width={36}
                height={36}
                className="size-9 object-cover"
              />
            ) : (
              <span className="flex size-9 items-center justify-center text-xs font-semibold text-[var(--bn-on-variant)]">
                {(access.displayName || access.email || "?")
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-[var(--bn-on)]">
              {name || "Perfil"}
            </span>
            <span className="block truncate text-xs text-[var(--bn-muted)]">
              {roleLabel[access.role]}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="w-full rounded-lg border border-[var(--bn-border)] px-3 py-2.5 text-xs font-medium text-[var(--bn-on-variant)] transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200"
        >
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--bn-border)] bg-[var(--bn-bg)]/90 px-4 py-3 backdrop-blur pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-lg border border-[var(--bn-border)] text-[var(--bn-on)] transition hover:bg-white/5"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
        <span className="font-brand-headline text-sm font-bold text-[var(--bn-on)]">
          Painel
        </span>
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
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarBody}
      </aside>
    </>
  );
}
