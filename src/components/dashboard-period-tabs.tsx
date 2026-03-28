"use client";

import Link from "next/link";

import type { DashboardRange } from "@/lib/admin-dashboard";
import type { AdminListFiltersParsed, TelemetryScope } from "@/lib/admin-list-url";
import { buildAdminPageHref } from "@/lib/admin-list-url";
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
  listFilters?: AdminListFiltersParsed;
  telemetryScope?: TelemetryScope;
};

export function DashboardPeriodTabs({
  current,
  page,
  listFilters,
  telemetryScope,
}: Props) {
  function hrefFor(range: DashboardRange): string {
    return buildAdminPageHref({
      page: page > 1 ? page : undefined,
      chartRange: range,
      filters: listFilters,
      telemetryScope:
        telemetryScope === "chartPeriod" ? "chartPeriod" : undefined,
    });
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
