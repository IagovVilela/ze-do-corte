"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import type { StaffAccess } from "@/lib/staff-access";
import { cn } from "@/lib/utils";

const roleLabel: Record<StaffAccess["role"], string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  STAFF: "Funcionário",
};

type NavItem = { href: string; label: string; show: boolean };

function sessionDisplayName(access: StaffAccess): string {
  const trimmed = access.displayName?.trim();
  if (trimmed) return trimmed;
  const email = access.email?.trim();
  if (email?.includes("@")) return email.split("@")[0] ?? email;
  if (email) return email;
  return "";
}

export function AdminPanelNav({ access }: { access: StaffAccess }) {
  const pathname = usePathname();
  const router = useRouter();
  const name = sessionDisplayName(access);

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
      href: "/admin/configuracao",
      label: "Configuração",
      show: access.permissions.manageSettings,
    },
  ];

  const visible = items.filter((i) => i.show);

  return (
    <nav
      aria-label="Secções do painel"
      className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2"
    >
      <ul className="flex flex-wrap gap-1.5">
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
                  "inline-flex rounded-full px-3.5 py-1.5 text-sm font-medium transition",
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
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Link
          href="/admin/perfil"
          className="flex items-center gap-2 rounded-full py-0.5 pr-2 pl-0.5 ring-1 ring-transparent transition hover:bg-white/5 hover:ring-white/10"
          title="Meu perfil"
        >
          <span className="relative block size-8 shrink-0 overflow-hidden rounded-full bg-zinc-700 ring-1 ring-white/10">
            {access.profileImageUrl ? (
              <Image
                src={access.profileImageUrl}
                alt=""
                width={32}
                height={32}
                className="size-8 object-cover"
              />
            ) : (
              <span className="flex size-8 items-center justify-center text-xs font-semibold text-zinc-200">
                {(access.displayName || access.email || "?").slice(0, 1).toUpperCase()}
              </span>
            )}
          </span>
        </Link>
        <p className="text-xs text-zinc-500">
          Sessão:{" "}
          <span className="font-medium text-zinc-300">
            {roleLabel[access.role]}
            {name ? (
              <>
                {" "}
                <span className="text-zinc-400">·</span>{" "}
                <span className="text-zinc-200">{name}</span>
              </>
            ) : null}
          </span>
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-200"
        >
          Sair
        </button>
      </div>
    </nav>
  );
}
