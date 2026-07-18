"use client";

import { Moon, Sun } from "lucide-react";

import { useAdminTheme } from "@/components/admin-theme-provider";
import type { AdminTheme } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

const OPTIONS: {
  id: AdminTheme;
  title: string;
  description: string;
  icon: typeof Moon;
}[] = [
  {
    id: "dark",
    title: "Escuro",
    description: "Visual Onyx da marca — confortável à noite.",
    icon: Moon,
  },
  {
    id: "light",
    title: "Claro",
    description: "Fundo claro para uso diurno e salas bem iluminadas.",
    icon: Sun,
  },
];

/**
 * Seletor de tema do painel (localStorage + cookie).
 * Casa principal da aparência em `/admin/configuracao`.
 */
export function AdminConfigAppearance() {
  const { theme, setTheme } = useAdminTheme();

  return (
    <section
      id="aparencia"
      className="bn-card scroll-mt-24 rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-5 sm:p-6"
    >
      <h2 className="font-brand-headline text-lg font-bold tracking-tight text-[var(--bn-on)]">
        Aparência
      </h2>
      <p className="mt-1 text-sm text-[var(--bn-muted)]">
        Escolha o tema do painel neste aparelho. A preferência fica salva no
        navegador.
      </p>

      <div
        className="mt-5 grid gap-3 sm:grid-cols-2"
        role="radiogroup"
        aria-label="Tema do painel"
      >
        {OPTIONS.map((opt) => {
          const active = theme === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(opt.id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-4 text-left transition",
                active
                  ? "border-[var(--bn-primary)] bg-[var(--bn-primary-container)]/12 ring-1 ring-[var(--bn-primary)]/30"
                  : "border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] hover:border-[var(--bn-outline)] hover:bg-[var(--bn-hover)]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg",
                  active
                    ? "bg-[var(--bn-primary-container)] text-white"
                    : "bg-[var(--bn-surface-container)] text-[var(--bn-muted)]",
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--bn-on)]">
                  {opt.title}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[var(--bn-muted)]">
                  {opt.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
