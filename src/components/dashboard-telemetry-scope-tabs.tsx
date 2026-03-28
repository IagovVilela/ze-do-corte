"use client";

import Link from "next/link";

import type { DashboardRange } from "@/lib/admin-dashboard";
import type { AdminListFiltersParsed, TelemetryScope } from "@/lib/admin-list-url";
import { buildAdminPageHref } from "@/lib/admin-list-url";
import { cn } from "@/lib/utils";

const OPTIONS: { scope: TelemetryScope; label: string; hint: string }[] = [
  {
    scope: "todayWeek",
    label: "Hoje e semana",
    hint: "Hoje (data civil) e semana seg–dom",
  },
  {
    scope: "chartPeriod",
    label: "Período dos gráficos",
    hint: "Mesmo intervalo das abas de período acima desta secção",
  },
];

type Props = {
  current: TelemetryScope;
  chartRange: DashboardRange;
  page: number;
  listFilters?: AdminListFiltersParsed;
};

export function DashboardTelemetryScopeTabs({
  current,
  chartRange,
  page,
  listFilters,
}: Props) {
  function hrefFor(scope: TelemetryScope): string {
    return buildAdminPageHref({
      page: page > 1 ? page : undefined,
      chartRange,
      filters: listFilters,
      telemetryScope: scope === "chartPeriod" ? "chartPeriod" : undefined,
    });
  }

  return (
    <div
      className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4"
      role="tablist"
      aria-label="Janela da telemetria por unidade"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Janela da telemetria
      </p>
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-zinc-950/50 p-1">
        {OPTIONS.map(({ scope, label }) => {
          const active = current === scope;
          return (
            <Link
              key={scope}
              href={hrefFor(scope)}
              scroll={false}
              role="tab"
              aria-selected={active}
              title={OPTIONS.find((o) => o.scope === scope)?.hint}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-sky-500/20 text-sky-100 ring-1 ring-sky-500/35"
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
