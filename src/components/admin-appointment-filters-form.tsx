import Link from "next/link";

import type { DashboardRange } from "@/lib/admin-dashboard";
import {
  buildAdminPageHref,
  hasActiveListFilters,
  type AdminListFiltersParsed,
  type TelemetryScope,
} from "@/lib/admin-list-url";

const inputClass =
  "w-full min-w-0 rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-sm text-[var(--bn-on)] outline-none focus:border-brand-500/50";

type Props = {
  chartRange: DashboardRange;
  filters: AdminListFiltersParsed;
  units: { id: string; name: string }[];
  barbers: { id: string; label: string }[];
  showStaffFilter: boolean;
  showUnitFilter: boolean;
  /** Preserva `?telemetryScope=chart` ao enviar o formulário. */
  telemetryScope?: TelemetryScope;
};

export function AdminAppointmentFiltersForm({
  chartRange,
  filters,
  units,
  barbers,
  showStaffFilter,
  showUnitFilter,
  telemetryScope,
}: Props) {
  const clearHref = buildAdminPageHref({
    chartRange,
    telemetryScope:
      telemetryScope === "chartPeriod" ? "chartPeriod" : undefined,
  });
  const active = hasActiveListFilters(filters);

  return (
    <form
      method="get"
      action="/admin"
      className="flex flex-col gap-3 border-b border-[var(--bn-border)] px-5 py-4"
    >
      {chartRange !== "month" ? (
        <input type="hidden" name="chartRange" value={chartRange} />
      ) : null}
      {telemetryScope === "chartPeriod" ? (
        <input type="hidden" name="telemetryScope" value="chart" />
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs text-[var(--bn-muted)]">
          Status
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className={inputClass}
          >
            <option value="">Todos</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="COMPLETED">Concluído</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </label>
        {showStaffFilter ? (
          <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-xs text-[var(--bn-muted)]">
            Profissional
            <select
              name="staff"
              defaultValue={filters.staff ?? ""}
              className={inputClass}
            >
              <option value="">Todos</option>
              <option value="none">Sem profissional</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {showUnitFilter ? (
          <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs text-[var(--bn-muted)]">
            Unidade
            <select
              name="unit"
              defaultValue={filters.unit ?? ""}
              className={inputClass}
            >
              <option value="">Todas</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex min-w-[180px] flex-[2] flex-col gap-1 text-xs text-[var(--bn-muted)]">
          Buscar (nome, telefone ou e-mail)
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Ex.: João, 11999…"
            maxLength={80}
            className={inputClass}
            autoComplete="off"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 pb-0.5">
          <button
            type="submit"
            className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-brand-400"
          >
            Aplicar filtros
          </button>
          {active ? (
            <Link
              href={clearHref}
              className="rounded-full border border-[var(--bn-border)] px-4 py-2 text-sm text-[var(--bn-on-variant)] transition hover:bg-[var(--bn-hover)]"
            >
              Limpar
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}
