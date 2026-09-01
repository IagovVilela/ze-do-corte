import { describe, expect, it } from "vitest";

import {
  computeFixedCostAllocated,
  computeFixedCostPerHour,
  computeSellingPrice,
  computeServiceCost,
  workshopExampleCheck,
} from "@/lib/service-costing";

describe("service-costing", () => {
  it("calcula DF rateado por duração", () => {
    expect(computeFixedCostAllocated(25.64, 480)).toBeCloseTo(205.12, 1);
  });

  it("calcula CSV do workshop", () => {
    const cost = computeServiceCost({
      directLaborCost: 153.84,
      materialCost: 100,
      durationMinutes: 480,
      fixedCostPerHour: 25.64,
    });
    expect(cost.csvTotal).toBeCloseTo(458.96, 1);
  });

  it("calcula PV do workshop", () => {
    const pv = computeSellingPrice(458.96, 10, 20);
    expect(pv.suggestedPrice).toBeCloseTo(655.66, 1);
  });

  it("workshopExampleCheck passa", () => {
    expect(workshopExampleCheck()).toBe(true);
  });

  it("computeFixedCostPerHour divide custos fixos", () => {
    expect(computeFixedCostPerHour(4000, 156)).toBeCloseTo(25.64, 1);
  });
});
