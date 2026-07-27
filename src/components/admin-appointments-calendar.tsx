"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import { DollarSign, Monitor } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminAppointmentComandaSheet } from "@/components/admin-appointment-comanda-sheet";
import {
  AdminDateRangePicker,
  eachYmdInRange,
  rangeFromPreset,
  type DateRangeYmd,
} from "@/components/admin-date-range-picker";
import type { AppointmentRow } from "@/lib/types";
import { cn } from "@/lib/utils";

type UnitOption = { id: string; name: string };
type StaffOption = { id: string; label: string };
type CatalogService = { id: string; name: string; price: number };
type CatalogProduct = {
  id: string;
  name: string;
  price: number;
  stockQty: number | null;
};

type Props = {
  timezone: string;
  canManageStatus: boolean;
  units: UnitOption[];
  staffOptions: StaffOption[];
  catalogServices: CatalogService[];
  catalogProducts: CatalogProduct[];
};

const HOUR_START = 8;
const HOUR_END = 21;
const PX_PER_MIN = 1.1;

function ymdInTz(d: Date, tz: string): string {
  return formatInTimeZone(d, tz, "yyyy-MM-dd");
}

function minutesFromDayStart(iso: string, tz: string): number {
  const h = Number(formatInTimeZone(new Date(iso), tz, "H"));
  const m = Number(formatInTimeZone(new Date(iso), tz, "m"));
  return h * 60 + m;
}

function blockColor(status: AppointmentRow["status"], paid: boolean): string {
  if (status === "CANCELLED") return "bg-zinc-700/80 text-zinc-300 line-through";
  if (status === "COMPLETED") {
    return paid
      ? "bg-teal-800 text-teal-50"
      : "bg-amber-800/90 text-amber-50";
  }
  return paid ? "bg-sky-900 text-sky-50" : "bg-indigo-900 text-indigo-50";
}

export function AdminAppointmentsCalendar({
  timezone,
  canManageStatus,
  units,
  staffOptions,
  catalogServices,
  catalogProducts,
}: Props) {
  const [range, setRange] = useState<DateRangeYmd>(() =>
    rangeFromPreset("last7"),
  );
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitFilter, setUnitFilter] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [comandaId, setComandaId] = useState<string | null>(null);

  const dayKeys = useMemo(() => eachYmdInRange(range), [range]);
  const from = range.from;
  const to = range.to;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ from, to });
      if (unitFilter) q.set("unit", unitFilter);
      if (staffFilter) q.set("staff", staffFilter);
      const res = await fetch(`/api/admin/appointments?${q.toString()}`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        rows?: AppointmentRow[];
        message?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "Falha ao carregar.");
        setRows([]);
        return;
      }
      setRows(data.rows ?? []);
    } catch {
      setError("Erro de rede. Tente de novo.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, unitFilter, staffFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentRow[]>();
    for (const key of dayKeys) map.set(key, []);
    for (const row of rows) {
      const key = ymdInTz(new Date(row.startsAt), timezone);
      const list = map.get(key);
      if (list) list.push(row);
    }
    return map;
  }, [rows, dayKeys, timezone]);

  const hours = Array.from(
    { length: HOUR_END - HOUR_START },
    (_, i) => HOUR_START + i,
  );
  const dayStartMin = HOUR_START * 60;
  const totalMins = (HOUR_END - HOUR_START) * 60;
  const gridHeight = totalMins * PX_PER_MIN;
  const colMinW = dayKeys.length <= 7 ? "minmax(7rem, 1fr)" : "7rem";

  const nowTop = useMemo(() => {
    const today = ymdInTz(new Date(), timezone);
    if (!dayKeys.includes(today)) return null;
    const mins = minutesFromDayStart(new Date().toISOString(), timezone);
    if (mins < dayStartMin || mins > HOUR_END * 60) return null;
    return {
      day: today,
      top: (mins - dayStartMin) * PX_PER_MIN,
    };
  }, [dayKeys, timezone, dayStartMin]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <AdminDateRangePicker value={range} onChange={setRange} />
        <div className="flex flex-wrap gap-2">
          {units.length > 1 ? (
            <select
              className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface)] px-3 py-1.5 text-sm text-[var(--bn-on)]"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
            >
              <option value="">Todas as unidades</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          ) : null}
          {staffOptions.length > 0 ? (
            <select
              className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface)] px-3 py-1.5 text-sm text-[var(--bn-on)]"
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
            >
              <option value="">Todos os profissionais</option>
              <option value="none">Sem profissional</option>
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)]">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `3.25rem repeat(${dayKeys.length}, ${colMinW})`,
            minWidth:
              dayKeys.length > 7
                ? `${3.25 + dayKeys.length * 7}rem`
                : "720px",
          }}
        >
          <div className="sticky top-0 z-10 border-b border-[var(--bn-border)] bg-[var(--bn-surface)] p-2" />
          {dayKeys.map((key) => {
            const isToday = key === ymdInTz(new Date(), timezone);
            const count = byDay.get(key)?.length ?? 0;
            const label = format(new Date(`${key}T12:00:00`), "EEE dd/MM", {
              locale: ptBR,
            });
            return (
              <div
                key={key}
                className={cn(
                  "sticky top-0 z-10 border-b border-l border-[var(--bn-border)] bg-[var(--bn-surface)] px-2 py-2 text-[10px] capitalize sm:text-xs",
                  isToday && "font-semibold text-[var(--bn-primary)]",
                  !isToday && "text-[var(--bn-muted)]",
                )}
              >
                <span className="block truncate">{label}</span>
                <span className="text-[10px] opacity-80">{count}</span>
              </div>
            );
          })}

          <div className="relative border-r border-[var(--bn-border)]">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute right-1 text-[10px] text-[var(--bn-muted)]"
                style={{
                  top: (hour * 60 - dayStartMin) * PX_PER_MIN - 6,
                }}
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
            <div style={{ height: gridHeight }} />
          </div>

          {dayKeys.map((key) => (
            <div
              key={`col-${key}`}
              className="relative border-l border-[var(--bn-border)]"
              style={{ height: gridHeight }}
            >
              {hours.map((hour) => (
                <div
                  key={`${key}-h-${hour}`}
                  className="absolute inset-x-0 border-b border-[var(--bn-border)]/60"
                  style={{
                    top: (hour * 60 - dayStartMin) * PX_PER_MIN,
                    height: 60 * PX_PER_MIN,
                  }}
                />
              ))}

              {nowTop?.day === key ? (
                <div
                  className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-emerald-400"
                  style={{ top: nowTop.top }}
                />
              ) : null}

              {(byDay.get(key) ?? []).map((row) => {
                const startMin = minutesFromDayStart(row.startsAt, timezone);
                const endIso =
                  row.endsAt ??
                  new Date(
                    new Date(row.startsAt).getTime() + 30 * 60_000,
                  ).toISOString();
                const endMin = minutesFromDayStart(endIso, timezone);
                const top = Math.max(0, (startMin - dayStartMin) * PX_PER_MIN);
                const height = Math.max(
                  28,
                  (Math.max(endMin, startMin + 15) - startMin) * PX_PER_MIN,
                );
                const timeLabel = `${formatInTimeZone(new Date(row.startsAt), timezone, "HH:mm")} – ${formatInTimeZone(new Date(endIso), timezone, "HH:mm")}`;
                const names = row.serviceNames?.length
                  ? row.serviceNames
                  : [row.serviceName];
                const paid = Boolean(row.paidAt);
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setComandaId(row.id)}
                    className={cn(
                      "absolute inset-x-0.5 z-10 overflow-hidden rounded-md px-1.5 py-1 text-left shadow-sm transition hover:brightness-110",
                      blockColor(row.status, paid),
                      comandaId === row.id && "ring-2 ring-[var(--bn-primary)]",
                    )}
                    style={{ top, height }}
                    title={`${row.clientName} · ${names.join(", ")}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[10px] font-semibold leading-tight">
                        {timeLabel}
                      </span>
                      <span className="flex shrink-0 gap-0.5">
                        {paid ? <DollarSign className="size-3 opacity-90" /> : null}
                        {row.bookingSource === "site" ||
                        row.bookingSource === "whatsapp" ? (
                          <Monitor className="size-3 opacity-90" />
                        ) : null}
                      </span>
                    </div>
                    <p className="truncate text-[11px] font-medium leading-tight">
                      {row.clientName}
                    </p>
                    {height > 44 ? (
                      <ul className="mt-0.5 space-y-0 text-[10px] leading-tight opacity-90">
                        {names.slice(0, 3).map((n) => (
                          <li key={n} className="truncate">
                            · {n}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {loading ? (
          <p className="border-t border-[var(--bn-border)] px-4 py-3 text-sm text-[var(--bn-muted)]">
            Carregando período…
          </p>
        ) : null}
      </div>

      <AdminAppointmentComandaSheet
        appointmentId={comandaId}
        timezone={timezone}
        canEdit={canManageStatus}
        services={catalogServices}
        products={catalogProducts}
        onClose={() => setComandaId(null)}
        onChanged={() => void load()}
      />
    </div>
  );
}
