"use client";

import { cn } from "@/lib/utils";

export type FinanceUnitOption = { id: string; name: string };

const fieldClass =
  "rounded-xl border border-[var(--bn-outline)] bg-[var(--bn-surface)] px-3 py-2 text-sm text-[var(--bn-on)]";

/**
 * Seletor de filial padrão do financeiro.
 * Com 0–1 unidade ativas, não renderiza (visão já é da org/única filial).
 */
export function AdminFinanceUnitFilter({
  units,
  value,
  onChange,
  className,
  id = "finance-unit",
}: {
  units: FinanceUnitOption[];
  value: string;
  onChange: (unitId: string) => void;
  className?: string;
  id?: string;
}) {
  if (units.length <= 1) return null;

  return (
    <label className={cn("flex w-full flex-col space-y-1 sm:w-auto", className)}>
      <span className="text-xs text-[var(--bn-on-variant)]">Filial</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(fieldClass, "min-h-11 w-full min-w-0 sm:min-h-0 sm:min-w-[10rem]")}
      >
        <option value="">Todas</option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </label>
  );
}
