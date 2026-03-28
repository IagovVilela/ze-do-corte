import type { ReactNode } from "react";

import type { TelemetryScope } from "@/lib/admin-list-url";
import type { DashboardUnitTelemetryRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  rows: DashboardUnitTelemetryRow[];
  showRevenue: boolean;
  scope: TelemetryScope;
  /** Rótulo do período dos gráficos (ex.: «Março 2026») quando `scope === chartPeriod`. */
  chartPeriodLabel: string;
  filtersSlot?: ReactNode;
};

export function DashboardUnitTelemetry({
  rows,
  showRevenue,
  scope,
  chartPeriodLabel,
  filtersSlot,
}: Props) {
  if (rows.length === 0) {
    return (
      <div className="glass-card rounded-2xl border border-white/10 p-6 text-sm text-zinc-500">
        Nenhuma unidade cadastrada. Crie unidades em{" "}
        <span className="text-zinc-400">Unidades</span> para ver telemetria por loja.
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden rounded-2xl border border-sky-500/15">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="font-display text-lg font-normal uppercase tracking-wide text-sky-200/90">
          Telemetria por unidade
        </h3>
        {filtersSlot}
      </div>
      <div className="grid gap-4 p-5 pt-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((u) => (
          <div
            key={u.unitId || "none"}
            className={cn(
              "rounded-2xl border bg-zinc-950/40 p-4",
              u.isActive ? "border-white/10" : "border-zinc-600/30 opacity-90",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-medium text-zinc-100">{u.unitName}</p>
              {!u.isActive ? (
                <span className="rounded-full bg-zinc-600/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  Inativa
                </span>
              ) : null}
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2 border-b border-white/5 pb-2">
                <dt className="text-zinc-500">
                  {scope === "todayWeek" ? "Hoje (inícios)" : "Inícios no período"}
                </dt>
                <dd className="text-right font-semibold tabular-nums text-white">
                  {u.appointmentsToday}
                </dd>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                <span>Cnf. {u.todayConfirmed}</span>
                <span>·</span>
                <span>Concl. {u.todayCompleted}</span>
                <span>·</span>
                <span>Canc. {u.todayCancelled}</span>
              </div>
              {scope === "todayWeek" ? (
                <div className="flex justify-between gap-2 pt-1">
                  <dt className="text-zinc-500">Semana (inícios)</dt>
                  <dd className="font-medium tabular-nums text-zinc-200">
                    {u.appointmentsWeek}
                  </dd>
                </div>
              ) : null}
              {showRevenue ? (
                <>
                  <div className="flex justify-between gap-2 border-t border-white/5 pt-2 text-xs">
                    <dt className="text-zinc-500">
                      {scope === "todayWeek" ? "Recebido hoje" : "Recebido no período"}
                    </dt>
                    <dd className="font-medium tabular-nums text-emerald-300/90">
                      R$ {(u.receivedToday ?? 0).toFixed(2)}
                    </dd>
                  </div>
                  <p className="text-[11px] leading-snug text-zinc-600">
                    {scope === "todayWeek" ? (
                      <>
                        Por <span className="text-zinc-500">data do pagamento</span> registrado
                        hoje.
                      </>
                    ) : (
                      <>
                        Por <span className="text-zinc-500">data do pagamento</span> registrada no
                        período ({chartPeriodLabel}).
                      </>
                    )}
                  </p>
                  <div className="flex justify-between gap-2 text-xs">
                    <dt className="text-zinc-500">
                      {scope === "todayWeek"
                        ? "Concluídos hoje (valor)"
                        : "Concluídos no período (valor)"}
                    </dt>
                    <dd className="font-medium tabular-nums text-brand-300/90">
                      R$ {(u.completedValueToday ?? 0).toFixed(2)}
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
