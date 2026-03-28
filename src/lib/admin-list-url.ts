import type { AppointmentStatus } from "@prisma/client";
import { z } from "zod";

import type { DashboardRange } from "@/lib/dashboard-period";

const STATUS_VALUES = ["CONFIRMED", "COMPLETED", "CANCELLED"] as const;

const rawSchema = z.object({
  status: z.enum(STATUS_VALUES).optional(),
  staff: z.union([z.literal("none"), z.string().uuid()]).optional(),
  unit: z.string().uuid().optional(),
  q: z.string().max(80).optional(),
});

function pickParam(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (typeof s !== "string") return undefined;
  const t = s.trim();
  return t.length ? t : undefined;
}

export type AdminListFiltersParsed = {
  status?: AppointmentStatus;
  /** UUID do profissional ou `none` = sem profissional atribuído */
  staff?: string;
  unit?: string;
  q?: string;
};

/** Janela temporal da telemetria por unidade (`?telemetryScope=`). */
export type TelemetryScope = "todayWeek" | "chartPeriod";

const TELEMETRY_CHART = "chart" as const;

export function parseTelemetryScope(
  sp: Record<string, string | string[] | undefined>,
): TelemetryScope {
  const v = pickParam(sp.telemetryScope);
  return v === TELEMETRY_CHART ? "chartPeriod" : "todayWeek";
}

export function parseAdminListFilters(
  sp: Record<string, string | string[] | undefined>,
): AdminListFiltersParsed {
  const raw = {
    status: pickParam(sp.status),
    staff: pickParam(sp.staff),
    unit: pickParam(sp.unit),
    q: pickParam(sp.q),
  };
  const parsed = rawSchema.safeParse(raw);
  if (!parsed.success) return {};
  const out: AdminListFiltersParsed = {};
  if (parsed.data.status) out.status = parsed.data.status;
  if (parsed.data.staff) out.staff = parsed.data.staff;
  if (parsed.data.unit) out.unit = parsed.data.unit;
  if (parsed.data.q && parsed.data.q.trim().length > 0) {
    out.q = parsed.data.q.trim();
  }
  return out;
}

export function hasActiveListFilters(f: AdminListFiltersParsed): boolean {
  return Boolean(f.status || f.staff || f.unit || f.q);
}

export function buildAdminPageHref(opts: {
  page?: number;
  chartRange?: DashboardRange;
  filters?: AdminListFiltersParsed;
  /** Só enviado quando `chartPeriod` (URL `telemetryScope=chart`). */
  telemetryScope?: TelemetryScope;
}): string {
  const p = new URLSearchParams();
  if (opts.page !== undefined && opts.page > 1) {
    p.set("page", String(opts.page));
  }
  if (opts.chartRange && opts.chartRange !== "month") {
    p.set("chartRange", opts.chartRange);
  }
  if (opts.telemetryScope === "chartPeriod") {
    p.set("telemetryScope", TELEMETRY_CHART);
  }
  const f = opts.filters;
  if (f?.status) p.set("status", f.status);
  if (f?.staff === "none") p.set("staff", "none");
  else if (f?.staff) p.set("staff", f.staff);
  if (f?.unit) p.set("unit", f.unit);
  if (f?.q) p.set("q", f.q);
  const q = p.toString();
  return q ? `/admin?${q}` : "/admin";
}
