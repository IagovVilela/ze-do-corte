import { describe, expect, it } from "vitest";

import {
  cohortConfidence,
  funnelConfidence,
  hasCompareBaseline,
  safeRelativeDelta,
  showStandaloneCohort,
  volumeConfidence,
} from "./right-hand-confidence";

describe("right-hand-confidence", () => {
  it("funil < 15 é indicativo", () => {
    expect(funnelConfidence(14)).toBe("indicative");
    expect(funnelConfidence(15)).toBe("conclusive");
  });

  it("volume (pagos) < 15 é indicativo", () => {
    expect(volumeConfidence(2)).toBe("indicative");
    expect(volumeConfidence(15)).toBe("conclusive");
  });

  it("coorte eligible < 10 é indicativo e sem standalone", () => {
    expect(cohortConfidence(4)).toBe("indicative");
    expect(
      showStandaloneCohort([
        { windowDays: 30, eligible: 4 },
        { windowDays: 60, eligible: 2 },
      ]),
    ).toBe(false);
    expect(
      showStandaloneCohort([{ windowDays: 30, eligible: 10 }]),
    ).toBe(true);
  });

  it("previous=0 nunca gera +100%", () => {
    const r = safeRelativeDelta(100, 0, {
      kind: "money",
      allowDelta: true,
      pctFn: () => 100,
    });
    expect(r.deltaPercent).toBeNull();
    expect(r.deltaReason).toBe("no_baseline");
  });

  it("receita anterior abaixo de R$50 sem base", () => {
    expect(hasCompareBaseline(40, "money")).toBe(false);
    expect(hasCompareBaseline(50, "money")).toBe(true);
  });
});
