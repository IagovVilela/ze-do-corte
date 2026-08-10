/**
 * Agregações puras do Braço Direito (sem Prisma) — testáveis e fonte única de regras.
 */

export type MetricAppointmentRow = {
  status: "CONFIRMED" | "COMPLETED" | "CANCELLED" | string;
  paidAt: Date | string | null;
  amountPaid: number | null;
  servicePrice: number;
  startsAt: Date | string;
};

export type PeriodWindow = { from: Date; to: Date };

export type PeriodAggregation = {
  /** Agendamentos com startsAt no período (qualquer status). */
  appointments: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  /** Com paidAt no período (não cancelados). */
  paidCount: number;
  /** COMPLETED no período ainda sem paidAt. */
  completedUnpaid: number;
  /** Soma cash: amountPaid ?? servicePrice quando paidAt no período. */
  revenuePaid: number;
  /** Ticket médio sobre pagos no período. */
  avgTicketPaid: number;
  cancelRate: number;
  completionRate: number;
  /** Funil: agendado (=appointments) → confirmado → concluído → pago. */
  funnel: {
    scheduled: number;
    confirmed: number;
    completed: number;
    paid: number;
  };
};

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

function inWindow(d: Date, from: Date, to: Date): boolean {
  return d >= from && d <= to;
}

export function paidAmount(amountPaid: number | null, servicePrice: number): number {
  return amountPaid != null ? Number(amountPaid) : Number(servicePrice);
}

/**
 * Agrega linhas cujo `startsAt` já está filtrado para o período
 * (exceto receita/pagos, que usam `paidAt` na janela).
 *
 * Para receita correta quando o pagamento cai no período mas o startsAt não,
 * passe também `paidOnlyRows` (linhas com paidAt na janela).
 */
export function aggregatePeriodMetrics(
  startsAtRows: MetricAppointmentRow[],
  window: PeriodWindow,
  paidOnlyRows?: MetricAppointmentRow[],
): PeriodAggregation {
  const { from, to } = window;
  let confirmed = 0;
  let completed = 0;
  let cancelled = 0;
  let completedUnpaid = 0;

  for (const r of startsAtRows) {
    if (r.status === "CONFIRMED") confirmed += 1;
    if (r.status === "COMPLETED") {
      completed += 1;
      if (!r.paidAt) completedUnpaid += 1;
    }
    if (r.status === "CANCELLED") cancelled += 1;
  }

  const paidSource = paidOnlyRows ?? startsAtRows;
  let paidCount = 0;
  let revenuePaid = 0;
  for (const r of paidSource) {
    if (r.status === "CANCELLED") continue;
    if (!r.paidAt) continue;
    const paidAt = toDate(r.paidAt);
    if (!inWindow(paidAt, from, to)) continue;
    paidCount += 1;
    revenuePaid += paidAmount(r.amountPaid, r.servicePrice);
  }

  const appointments = startsAtRows.length;
  const cancelRate = appointments
    ? Math.round((cancelled / appointments) * 1000) / 10
    : 0;
  const completionRate = appointments
    ? Math.round((completed / appointments) * 1000) / 10
    : 0;
  const avgTicketPaid =
    paidCount > 0
      ? Math.round((revenuePaid / paidCount) * 100) / 100
      : 0;

  return {
    appointments,
    confirmed,
    completed,
    cancelled,
    paidCount,
    completedUnpaid,
    revenuePaid: Math.round(revenuePaid * 100) / 100,
    avgTicketPaid,
    cancelRate,
    completionRate,
    funnel: {
      scheduled: appointments,
      confirmed: confirmed + completed,
      completed,
      paid: paidCount,
    },
  };
}

/** Variação percentual relativa; null se ambos ~0. Cap quando previous≈0. */
export function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0 && current <= 0) return null;
  if (previous <= 0) return current > 0 ? 100 : null;
  const raw = ((current - previous) / previous) * 100;
  const rounded = Math.round(raw * 10) / 10;
  if (!Number.isFinite(rounded)) return null;
  return Math.max(-9999, Math.min(9999, rounded));
}

/** Diferença em pontos percentuais (para taxas). */
export function pointsDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  return Math.round((current - previous) * 10) / 10;
}

export function formatDeltaPercent(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const formatted = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
    signDisplay: "exceptZero",
  }).format(n);
  return `${formatted}%`;
}

export function formatDeltaPoints(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const formatted = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
    signDisplay: "exceptZero",
  }).format(n);
  return `${formatted} pp`;
}

export function appointmentsSubtitle(agg: PeriodAggregation): string {
  if (agg.appointments === 0) return "Nenhum no período";
  if (agg.paidCount === 0 && (agg.completed > 0 || agg.appointments > 0)) {
    return `${agg.appointments} no período · ${agg.paidCount} pagos ainda`;
  }
  return `${agg.appointments} no período · ${agg.paidCount} pagos`;
}

/** LTV = média de gastos históricos > 0. */
export function averageHistoricalLtv(spents: number[]): number | null {
  const positive = spents.filter((s) => s > 0);
  if (positive.length === 0) return null;
  const sum = positive.reduce((a, b) => a + b, 0);
  return Math.round((sum / positive.length) * 100) / 100;
}

export type CohortBucket = {
  windowDays: 30 | 60 | 90;
  eligible: number;
  returned: number;
  ratePercent: number;
};

/**
 * Coorte simples: clientes com 1º COMPLETED há pelo menos `windowDays`;
 * "voltou" = outro COMPLETED entre 1º+1d e 1º+windowDays.
 */
export function computeReturnCohorts(
  firstCompletedByPhone: Map<string, Date>,
  allCompleted: { phoneKey: string; at: Date }[],
  asOf: Date,
): CohortBucket[] {
  const byPhone = new Map<string, Date[]>();
  for (const row of allCompleted) {
    const list = byPhone.get(row.phoneKey) ?? [];
    list.push(row.at);
    byPhone.set(row.phoneKey, list);
  }
  for (const [, list] of byPhone) list.sort((a, b) => a.getTime() - b.getTime());

  const windows: Array<30 | 60 | 90> = [30, 60, 90];
  return windows.map((windowDays) => {
    let eligible = 0;
    let returned = 0;
    const ms = windowDays * 24 * 60 * 60 * 1000;
    for (const [phone, first] of firstCompletedByPhone) {
      if (first.getTime() + ms > asOf.getTime()) continue;
      eligible += 1;
      const visits = byPhone.get(phone) ?? [];
      const end = first.getTime() + ms;
      const cameBack = visits.some(
        (d) => d.getTime() > first.getTime() && d.getTime() <= end,
      );
      if (cameBack) returned += 1;
    }
    return {
      windowDays,
      eligible,
      returned,
      ratePercent: eligible
        ? Math.round((returned / eligible) * 1000) / 10
        : 0,
    };
  });
}

export type RevenuePeakValley = {
  peakIndex: number | null;
  valleyIndex: number | null;
};

export function findPeakValley(
  amounts: number[],
): RevenuePeakValley {
  if (amounts.length === 0) return { peakIndex: null, valleyIndex: null };
  let peakIndex = 0;
  let valleyIndex = 0;
  for (let i = 1; i < amounts.length; i++) {
    if (amounts[i]! > amounts[peakIndex]!) peakIndex = i;
    if (amounts[i]! < amounts[valleyIndex]!) valleyIndex = i;
  }
  const hasAny = amounts.some((a) => a > 0);
  if (!hasAny) return { peakIndex: null, valleyIndex: null };
  return { peakIndex, valleyIndex };
}

/** Previsão simples: média do mesmo weekday nas últimas N semanas. */
export function predictWeekdayDemand(
  countsByWeekday: Record<number, number[]>,
): { weekday: number; avg: number; label: string }[] {
  const labels: Record<number, string> = {
    1: "Segunda",
    2: "Terça",
    3: "Quarta",
    4: "Quinta",
    5: "Sexta",
    6: "Sábado",
    7: "Domingo",
  };
  const out: { weekday: number; avg: number; label: string }[] = [];
  for (let wd = 1; wd <= 7; wd++) {
    const samples = countsByWeekday[wd] ?? [];
    if (samples.length === 0) continue;
    const avg =
      Math.round(
        (samples.reduce((s, n) => s + n, 0) / samples.length) * 10,
      ) / 10;
    out.push({ weekday: wd, avg, label: labels[wd] ?? `Dia ${wd}` });
  }
  return out.sort((a, b) => a.avg - b.avg);
}
