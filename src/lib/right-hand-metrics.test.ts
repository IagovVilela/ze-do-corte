import { describe, expect, it } from "vitest";

import {
  aggregatePeriodMetrics,
  appointmentsSubtitle,
  averageHistoricalLtv,
  formatDeltaPercent,
  formatDeltaPoints,
  pctDelta,
  pointsDelta,
  type MetricAppointmentRow,
} from "./right-hand-metrics";

const from = new Date("2026-08-01T00:00:00.000Z");
const to = new Date("2026-08-31T23:59:59.999Z");

function row(
  partial: Partial<MetricAppointmentRow> &
    Pick<MetricAppointmentRow, "status" | "startsAt">,
): MetricAppointmentRow {
  return {
    paidAt: null,
    amountPaid: null,
    servicePrice: 50,
    ...partial,
  };
}

describe("aggregatePeriodMetrics", () => {
  it("receita 0 implica paidCount 0", () => {
    const agg = aggregatePeriodMetrics(
      [
        row({
          status: "COMPLETED",
          startsAt: new Date("2026-08-10T12:00:00.000Z"),
          paidAt: null,
        }),
        row({
          status: "CONFIRMED",
          startsAt: new Date("2026-08-11T12:00:00.000Z"),
        }),
      ],
      { from, to },
    );
    expect(agg.revenuePaid).toBe(0);
    expect(agg.paidCount).toBe(0);
    expect(agg.completed).toBe(1);
    expect(agg.completedUnpaid).toBe(1);
    expect(agg.appointments).toBe(2);
  });

  it("completed unpaid vs paid distinction", () => {
    const agg = aggregatePeriodMetrics(
      [
        row({
          status: "COMPLETED",
          startsAt: new Date("2026-08-10T12:00:00.000Z"),
          paidAt: null,
          servicePrice: 80,
        }),
        row({
          status: "COMPLETED",
          startsAt: new Date("2026-08-12T12:00:00.000Z"),
          paidAt: new Date("2026-08-12T15:00:00.000Z"),
          amountPaid: 90,
          servicePrice: 80,
        }),
      ],
      { from, to },
    );
    expect(agg.completed).toBe(2);
    expect(agg.paidCount).toBe(1);
    expect(agg.revenuePaid).toBe(90);
    expect(agg.completedUnpaid).toBe(1);
    expect(appointmentsSubtitle(agg)).toContain("2 no período");
    expect(appointmentsSubtitle(agg)).toContain("1 pagos");
  });

  it("usa amountPaid ?? price e conta pagos por paidAt", () => {
    const startsAtRows = [
      row({
        status: "CONFIRMED",
        startsAt: new Date("2026-07-20T12:00:00.000Z"),
        paidAt: new Date("2026-08-05T12:00:00.000Z"),
        amountPaid: null,
        servicePrice: 40,
      }),
    ];
    const paidOnly = [
      row({
        status: "CONFIRMED",
        startsAt: new Date("2026-07-20T12:00:00.000Z"),
        paidAt: new Date("2026-08-05T12:00:00.000Z"),
        amountPaid: null,
        servicePrice: 40,
      }),
    ];
    const agg = aggregatePeriodMetrics(startsAtRows, { from, to }, paidOnly);
    // startsAt fora do período → appointments 1 só se passarmos essa linha;
    // aqui startsAtRows tem 1 mas está fora da intenção — teste foca paidOnly
    expect(agg.revenuePaid).toBe(40);
    expect(agg.paidCount).toBe(1);
  });

  it("atendimentos do período ≠ lifetime (só conta rows passadas)", () => {
    const period = aggregatePeriodMetrics(
      [
        row({
          status: "COMPLETED",
          startsAt: new Date("2026-08-01T10:00:00.000Z"),
          paidAt: new Date("2026-08-01T11:00:00.000Z"),
          amountPaid: 50,
        }),
      ],
      { from, to },
    );
    const lifetimeLike = 403;
    expect(period.appointments).toBe(1);
    expect(period.appointments).not.toBe(lifetimeLike);
  });
});

describe("averageHistoricalLtv", () => {
  it("não depende de pageSize — usa lista completa passada", () => {
    const all = [100, 200, 300, 0];
    const page = all.slice(0, 2);
    expect(averageHistoricalLtv(page)).toBe(150);
    expect(averageHistoricalLtv(all)).toBe(200);
  });
});

describe("deltas", () => {
  it("formatDeltaPercent sem zero à esquerda", () => {
    expect(formatDeltaPercent(67)).toBe("+67%");
    expect(formatDeltaPercent(-12.5)).toMatch(/-12[,.]5%/);
    expect(formatDeltaPercent(null)).toBe("—");
  });

  it("cancelamentos em pontos percentuais", () => {
    expect(pointsDelta(15, 10)).toBe(5);
    expect(formatDeltaPoints(5)).toBe("+5 pp");
    expect(pctDelta(15, 10)).toBe(50);
  });
});
