"use client";

import { Moon, Sun } from "lucide-react";

import { useAdminTheme } from "@/components/admin-theme-provider";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Variante compacta para a sidebar. */
  compact?: boolean;
};

export function AdminThemeToggle({ className, compact }: Props) {
  const { theme, toggleTheme } = useAdminTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--bn-border)] text-[var(--bn-on-variant)] transition hover:bg-[var(--bn-hover)] hover:text-[var(--bn-on)]",
        compact ? "size-10" : "w-full px-3 py-2.5 text-xs font-medium",
        className,
      )}
      aria-label={isLight ? "Ativar modo escuro" : "Ativar modo claro"}
      title={isLight ? "Modo escuro" : "Modo claro"}
    >
      {isLight ? (
        <Moon className="size-4 shrink-0" aria-hidden />
      ) : (
        <Sun className="size-4 shrink-0" aria-hidden />
      )}
      {compact ? null : (
        <span>{isLight ? "Modo escuro" : "Modo claro"}</span>
      )}
    </button>
  );
}
