"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminRightHandChartShell } from "@/components/admin-right-hand-chart-shell";
import type {
  AppointmentFrequencyHeatmap,
  FrequencyCell,
  IsoWeekday,
} from "@/lib/admin-appointment-frequency-types";
import type { DashboardRange } from "@/lib/dashboard-period";
import type { ConfidenceLevel } from "@/lib/right-hand-confidence";
import { cn } from "@/lib/utils";

type UnitOption = { id: string; name: string };
type StaffOption = { id: string; label: string };

type Props = {
  units: UnitOption[];
  staffOptions: StaffOption[];
  /** Quando definido, a API usa a mesma janela do dashboard (Inteligência / Relatórios). */
  chartRange?: DashboardRange;
  /** Força selo/opacidade (ex.: pagos &lt; 15 no snapshot). */
  forceConfidence?: ConfidenceLevel;
};

const WEEKDAY_LABEL: Record<IsoWeekday, string> = {
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
  7: "Dom",
};

const LEGEND = [
  { label: "0% – 20%", className: "bg-sky-300 text-sky-950" },
  { label: "21% – 40%", className: "bg-emerald-400 text-emerald-950" },
  { label: "41% – 60%", className: "bg-amber-300 text-amber-950" },
  { label: "61% – 80%", className: "bg-orange-400 text-orange-950" },
  { label: "81% – 100%", className: "bg-rose-500 text-white" },
] as const;

function bandClass(percent: number): string {
  if (percent <= 20) return "bg-sky-300 text-sky-950";
  if (percent <= 40) return "bg-emerald-400 text-emerald-950";
  if (percent <= 60) return "bg-amber-300 text-amber-950";
  if (percent <= 80) return "bg-orange-400 text-orange-950";
  return "bg-rose-500 text-white";
}

function cellKey(weekday: IsoWeekday, hour: number): string {
  return `${weekday}:${hour}`;
}

const COLS = "2.75rem repeat(7, minmax(3.5rem, 1fr))";

export function AdminAppointmentFrequencyHeatmap({
  units,
  staffOptions,
  chartRange,
  forceConfidence,
}: Props) {
  const [unitDraft, setUnitDraft] = useState("");
  const [staffDraft, setStaffDraft] = useState("");
  const [unitApplied, setUnitApplied] = useState("");
  const [staffApplied, setStaffApplied] = useState("");
  const [data, setData] = useState<AppointmentFrequencyHeatmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<FrequencyCell | null>(null);

  const load = useCallback(
    async (unit: string, staff: string) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (unit) qs.set("unit", unit);
        if (staff) qs.set("staff", staff);
        if (chartRange) qs.set("chartRange", chartRange);
        const res = await fetch(
          `/api/admin/appointments/frequency?${qs.toString()}`,
          { credentials: "same-origin" },
        );
        const json = (await res.json()) as
          | AppointmentFrequencyHeatmap
          | { message?: string };
        if (!res.ok) {
          setError(
            "message" in json && json.message
              ? json.message
              : "Não foi possível carregar a frequência.",
          );
          setData(null);
          return;
        }
        setData(json as AppointmentFrequencyHeatmap);
      } catch {
        setError("Erro de rede ao carregar a frequência.");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [chartRange],
  );

  useEffect(() => {
    void load(unitApplied, staffApplied);
  }, [load, unitApplied, staffApplied]);

  const byKey = useMemo(() => {
    const map = new Map<string, FrequencyCell>();
    for (const cell of data?.cells ?? []) {
      map.set(cellKey(cell.weekday, cell.hour), cell);
    }
    return map;
  }, [data]);

  function applyFilters() {
    setUnitApplied(unitDraft);
    setStaffApplied(staffDraft);
  }

  const showUnitFilter = units.length > 1;
  const showStaffFilter = staffOptions.length > 0;
  const showFilters = showUnitFilter || showStaffFilter;
  const weekdays = data?.weekdays ?? ([1, 2, 3, 4, 5, 6, 7] as IsoWeekday[]);
  const hours = data?.hours ?? [];
  const confidence: ConfidenceLevel =
    forceConfidence === "indicative" || data?.confidence === "indicative"
      ? "indicative"
      : (data?.confidence ?? "conclusive");
  const periodSubtitle =
    data?.periodLabel ??
    (chartRange ? "Período selecionado" : "Últimos 30 dias");
  const scaleNote =
    data?.scaleMode === "relative"
      ? "Intensidade relativa (amostra pequena) — não é ocupação de agenda."
      : "Ocupação estimada vs capacidade no período.";

  return (
    <AdminRightHandChartShell
      id="demanda-fraca"
      title="Frequência de cortes"
      subtitle={`${periodSubtitle} · ${scaleNote}`}
      confidence={confidence}
      className="bg-[var(--bn-surface-elevated)]"
    >
      {showFilters ? (
        <div className="mb-4 flex flex-col gap-4 border-b border-[var(--bn-border)] pb-4">
          <div>
            <h2 className="text-sm font-bold tracking-wide text-[var(--bn-muted)] uppercase">
              Filtros
            </h2>
            <div className="mt-3 grid gap-3 sm:flex sm:flex-wrap sm:items-end">
              {showUnitFilter ? (
                <label className="flex w-full min-w-0 flex-col gap-1 text-xs text-[var(--bn-muted)] sm:w-auto sm:min-w-[10rem]">
                  Filial
                  <select
                    className="min-h-11 w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-base text-[var(--bn-on)] sm:min-h-0 sm:text-sm"
                    value={unitDraft}
                    onChange={(e) => setUnitDraft(e.target.value)}
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
              {showStaffFilter ? (
                <label className="flex w-full min-w-0 flex-col gap-1 text-xs text-[var(--bn-muted)] sm:w-auto sm:min-w-[10rem]">
                  Profissional
                  <select
                    className="min-h-11 w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-base text-[var(--bn-on)] sm:min-h-0 sm:text-sm"
                    value={staffDraft}
                    onChange={(e) => setStaffDraft(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {staffOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button
                type="button"
                onClick={applyFilters}
                className="min-h-11 w-full rounded-xl bg-[var(--bn-primary)] px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:opacity-90 sm:min-h-0 sm:w-auto sm:py-2"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ul className="mb-3 flex flex-wrap gap-2" aria-label="Legenda de ocupação">
        {LEGEND.map((item) => (
          <li
            key={item.label}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-semibold",
              item.className,
            )}
          >
            {item.label}
          </li>
        ))}
      </ul>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl bg-[var(--bn-surface)] p-2">
        {loading && !data ? (
          <p className="py-10 text-center text-sm text-[var(--bn-muted)]">
            Carregando frequência…
          </p>
        ) : data ? (
          <div
            className="min-w-[32rem] space-y-1.5 sm:min-w-[36rem]"
            role="table"
            aria-label="Frequência de cortes por dia e hora"
          >
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: COLS }}
              role="row"
            >
              <div className="h-8" />
              {weekdays.map((wd) => (
                <div
                  key={`h-${wd}`}
                  className="flex h-8 items-center justify-center text-xs font-semibold text-[var(--bn-muted)]"
                >
                  {WEEKDAY_LABEL[wd]}
                </div>
              ))}
            </div>

            {hours.map((hour) => (
              <div
                key={`row-${hour}`}
                className="grid gap-1.5"
                style={{ gridTemplateColumns: COLS }}
                role="row"
              >
                <div className="flex h-10 items-center justify-end pr-1 text-xs font-medium text-[var(--bn-muted)]">
                  {String(hour).padStart(2, "0")}h
                </div>
                {weekdays.map((wd) => {
                  const cell = byKey.get(cellKey(wd, hour));
                  const percent = cell?.percent ?? 0;
                  const count = cell?.count ?? 0;
                  return (
                    <button
                      key={`${wd}-${hour}`}
                      type="button"
                      title={`${WEEKDAY_LABEL[wd]} ${String(hour).padStart(2, "0")}h · ${percent}% (${count} corte${count === 1 ? "" : "s"})`}
                      onMouseEnter={() =>
                        setHover({ weekday: wd, hour, count, percent })
                      }
                      onMouseLeave={() => setHover(null)}
                      onFocus={() =>
                        setHover({ weekday: wd, hour, count, percent })
                      }
                      onClick={() =>
                        setHover({ weekday: wd, hour, count, percent })
                      }
                      className={cn(
                        "flex h-10 items-center justify-center rounded-lg text-xs font-bold transition",
                        bandClass(percent),
                        loading && "opacity-70",
                        hover?.weekday === wd &&
                          hover.hour === hour &&
                          "ring-2 ring-[var(--bn-on)]/40 ring-offset-1 ring-offset-[var(--bn-surface)]",
                      )}
                    >
                      {percent > 0 ? `${percent}%` : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {hover ? (
        <p className="mt-3 text-xs text-[var(--bn-muted)]">
          {WEEKDAY_LABEL[hover.weekday]} {String(hover.hour).padStart(2, "0")}h:{" "}
          <span className="font-semibold text-[var(--bn-on)]">
            {hover.percent}%
          </span>
          {" · "}
          {hover.count} corte{hover.count === 1 ? "" : "s"} no período
        </p>
      ) : data ? (
        <p className="mt-3 text-xs text-[var(--bn-muted)]">
          {data.totalAppointments} agendamento
          {data.totalAppointments === 1 ? "" : "s"} confirmado/concluído no
          período · toque ou passe o mouse numa célula para o detalhe
        </p>
      ) : null}
    </AdminRightHandChartShell>
  );
}
