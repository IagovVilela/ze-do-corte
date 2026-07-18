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
      <div className="glass-card rounded-2xl border border-[var(--bn-border)] p-6 text-sm text-[var(--bn-muted)]">
        Nenhuma unidade cadastrada. Crie unidades em{" "}
        <span className="text-[var(--bn-muted)]">Unidades</span> para ver telemetria por loja.
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden rounded-2xl border border-sky-500/15">
      <div className="border-b border-[var(--bn-border)] px-5 py-4">
        <h3 className="font-display text-lg font-normal uppercase tracking-wide text-[var(--bn-primary)]">
          Telemetria por unidade
        </h3>
        {filtersSlot}
      </div>
      <div className="grid gap-4 p-5 pt-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((u) => (
          <div
            key={u.unitId || "none"}
            className={cn(
              "rounded-2xl border bg-[var(--bn-surface-lowest)]/40 p-4",
              u.isActive ? "border-[var(--bn-border)]" : "border-zinc-600/30 opacity-90",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-medium text-[var(--bn-on)]">{u.unitName}</p>
              {!u.isActive ? (
                <span className="rounded-full bg-[var(--bn-surface-container)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--bn-muted)]">
                  Inativa
                </span>
              ) : null}
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2 border-b border-[var(--bn-border)] pb-2">
                <dt className="text-[var(--bn-muted)]">
                  {scope === "todayWeek" ? "Hoje (inícios)" : "Inícios no período"}
                </dt>
                <dd className="text-right font-semibold tabular-nums text-[var(--bn-on)]">
                  {u.appointmentsToday}
                </dd>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--bn-muted)]">
                <span>Cnf. {u.todayConfirmed}</span>
                <span>·</span>
                <span>Concl. {u.todayCompleted}</span>
                <span>·</span>
                <span>Canc. {u.todayCancelled}</span>
              </div>
              {scope === "todayWeek" ? (
                <div className="flex justify-between gap-2 pt-1">
                  <dt className="text-[var(--bn-muted)]">Semana (inícios)</dt>
                  <dd className="font-medium tabular-nums text-[var(--bn-on-variant)]">
                    {u.appointmentsWeek}
                  </dd>
                </div>
              ) : null}
              {showRevenue ? (
                <>
                  <div className="flex justify-between gap-2 border-t border-[var(--bn-border)] pt-2 text-xs">
                    <dt className="text-[var(--bn-muted)]">
                      {scope === "todayWeek" ? "Recebido hoje" : "Recebido no período"}
                    </dt>
                    <dd className="font-medium tabular-nums text-emerald-700/90">
                      R$ {(u.receivedToday ?? 0).toFixed(2)}
                    </dd>
                  </div>
                  <p className="text-[11px] leading-snug text-[var(--bn-muted)]">
                    {scope === "todayWeek" ? (
                      <>
                        Por <span className="text-[var(--bn-muted)]">data do pagamento</span> registrado
                        hoje.
                      </>
                    ) : (
                      <>
                        Por <span className="text-[var(--bn-muted)]">data do pagamento</span> registrada no
                        período ({chartPeriodLabel}).
                      </>
                    )}
                  </p>
                  <div className="flex justify-between gap-2 text-xs">
                    <dt className="text-[var(--bn-muted)]">
                      {scope === "todayWeek"
                        ? "Concluídos hoje (valor)"
                        : "Concluídos no período (valor)"}
                    </dt>
                    <dd className="font-medium tabular-nums text-[var(--bn-primary)]">
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
