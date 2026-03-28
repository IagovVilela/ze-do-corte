"use client";

import Link from "next/link";

import type { DashboardRange } from "@/lib/admin-dashboard";
import { cn } from "@/lib/utils";

const OPTIONS: { range: DashboardRange; label: string }[] = [
  { range: "day", label: "Hoje" },
  { range: "7d", label: "7 dias" },
  { range: "month", label: "Mês" },
  { range: "3m", label: "3 meses" },
];

type Props = {
  current: DashboardRange;
  page: number;
};

export function DashboardPeriodTabs({ current, page }: Props) {
  function hrefFor(range: DashboardRange): string {
    const p = new URLSearchParams();
    if (page > 1) p.set("page", String(page));
    if (range !== "month") p.set("chartRange", range);
    const q = p.toString();
    return q ? `/admin?${q}` : "/admin";
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Período dos gráficos
        </p>
      </div>
      <div
        className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-zinc-950/50 p-1"
        role="tablist"
        aria-label="Período do dashboard"
      >
        {OPTIONS.map(({ range, label }) => {
          const active = current === range;
          return (
            <Link
              key={range}
              href={hrefFor(range)}
              scroll={false}
              role="tab"
              aria-selected={active}
              className={cn(
                "rounded-xl px-3.5 py-2 text-sm font-medium transition",
                active
                  ? "bg-brand-500/25 text-brand-100 ring-1 ring-brand-500/40"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
