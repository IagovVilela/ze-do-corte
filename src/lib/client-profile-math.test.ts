import { describe, expect, it } from "vitest";

import {
  isOverdueVsUsualGap,
  usualGapDaysFromVisits,
} from "./client-profile-math";

describe("client-profile math", () => {
  it("usualGap precisa de 3 visitas", () => {
    const d0 = new Date("2026-01-01");
    const d1 = new Date("2026-01-15");
    expect(usualGapDaysFromVisits([d0, d1])).toBeNull();
  });

  it("usualGap usa mediana", () => {
    const dates = [
      new Date("2026-01-01"),
      new Date("2026-01-15"),
      new Date("2026-01-29"),
      new Date("2026-02-12"),
    ];
    expect(usualGapDaysFromVisits(dates)).toBe(14);
  });

  it("atraso vs 14d * 1.4", () => {
    expect(
      isOverdueVsUsualGap({
        lastCompletedAt: new Date("2026-01-01"),
        usualGapDays: 14,
        now: new Date("2026-01-22"),
      }),
    ).toBe(true);
    expect(
      isOverdueVsUsualGap({
        lastCompletedAt: new Date("2026-01-01"),
        usualGapDays: 14,
        now: new Date("2026-01-10"),
      }),
    ).toBe(false);
  });
});
