/**
 * Guarda-corpo estatístico do Braço Direito — limiares e níveis de confiança.
 */

export type ConfidenceLevel = "conclusive" | "indicative";

export const RH_THRESHOLDS = {
  funnelMinAppointments: 15,
  cohortMinEligible: 10,
  predictionMinWeeks: 3,
  deltaMinRevenuePrevious: 50,
  deltaMinAppointmentsPrevious: 5,
  cancelInsightMinAppointments: 10,
} as const;

export function funnelConfidence(appointments: number): ConfidenceLevel {
  return appointments >= RH_THRESHOLDS.funnelMinAppointments
    ? "conclusive"
    : "indicative";
}

/** Volume de caixa no período (pagos) — selo nos cards/gráficos dependentes. */
export function volumeConfidence(paidCount: number): ConfidenceLevel {
  return paidCount >= RH_THRESHOLDS.funnelMinAppointments
    ? "conclusive"
    : "indicative";
}

export function cohortConfidence(eligible: number): ConfidenceLevel {
  return eligible >= RH_THRESHOLDS.cohortMinEligible
    ? "conclusive"
    : "indicative";
}

export function predictionConfidence(weekSampleCount: number): ConfidenceLevel {
  return weekSampleCount >= RH_THRESHOLDS.predictionMinWeeks
    ? "conclusive"
    : "indicative";
}

export type DeltaBaselineKind = "money" | "count" | "rate";

/**
 * True quando o denominador do período anterior é forte o bastante para % relativo.
 */
export function hasCompareBaseline(
  previous: number,
  kind: DeltaBaselineKind,
): boolean {
  if (previous <= 0) return false;
  if (kind === "money") {
    return previous >= RH_THRESHOLDS.deltaMinRevenuePrevious;
  }
  if (kind === "count") {
    return previous >= RH_THRESHOLDS.deltaMinAppointmentsPrevious;
  }
  // taxas: precisa de valor anterior > 0 já coberto
  return previous > 0;
}

export type SafeDeltaResult = {
  deltaPercent: number | null;
  deltaReason: "ok" | "no_baseline" | "insufficient_maturity";
};

export function safeRelativeDelta(
  current: number,
  previous: number,
  opts: {
    kind: DeltaBaselineKind;
    allowDelta: boolean;
    /** Função de variação relativa (pctDelta). */
    pctFn: (c: number, p: number) => number | null;
  },
): SafeDeltaResult {
  if (!opts.allowDelta) {
    return { deltaPercent: null, deltaReason: "insufficient_maturity" };
  }
  if (!hasCompareBaseline(previous, opts.kind)) {
    return { deltaPercent: null, deltaReason: "no_baseline" };
  }
  return {
    deltaPercent: opts.pctFn(current, previous),
    deltaReason: "ok",
  };
}

export function safePointsDelta(
  current: number,
  previous: number,
  opts: {
    allowDelta: boolean;
    currentSample: number;
    pointsFn: (c: number, p: number) => number | null;
  },
): SafeDeltaResult {
  if (!opts.allowDelta) {
    return { deltaPercent: null, deltaReason: "insufficient_maturity" };
  }
  if (opts.currentSample < RH_THRESHOLDS.cancelInsightMinAppointments) {
    return { deltaPercent: null, deltaReason: "no_baseline" };
  }
  if (previous <= 0 && current <= 0) {
    return { deltaPercent: null, deltaReason: "no_baseline" };
  }
  return {
    deltaPercent: opts.pointsFn(current, previous),
    deltaReason: "ok",
  };
}

export function showStandaloneCohort(
  cohorts: { windowDays: number; eligible: number }[],
): boolean {
  const c30 = cohorts.find((c) => c.windowDays === 30);
  return (c30?.eligible ?? 0) >= RH_THRESHOLDS.cohortMinEligible;
}

export function confidenceLabel(level: ConfidenceLevel): string | null {
  if (level === "conclusive") return null;
  return "Poucos dados ainda";
}
