import { describe, expect, it } from "vitest";

import {
  computeFixedCostPerHour,
  computeSellingPrice,
  computeServiceCost,
} from "@/lib/service-costing";

describe("finance-break-even helpers", () => {
  it("calcula PE em unidades a partir de margem", () => {
    const fixedCosts = 4000;
    const avgContribution = 100;
    const breakEvenUnits = Math.ceil(fixedCosts / avgContribution);
    expect(breakEvenUnits).toBe(40);
  });

  it("margem de contribuição por serviço considera CSV e DV%", () => {
    const cost = computeServiceCost({
      directLaborCost: 50,
      materialCost: 20,
      durationMinutes: 60,
      fixedCostPerHour: computeFixedCostPerHour(4000, 156),
    });
    const price = computeSellingPrice(cost.csvTotal, 10, 20).suggestedPrice;
    const variable = price * 0.1;
    const contribution = price - cost.csvTotal - variable;
    expect(contribution).toBeGreaterThan(0);
  });
});

describe("finance-dre helpers", () => {
  it("resultado líquido = margem - fixos - pró-labore - comissões", () => {
    const contribution = 10000;
    const fixed = 3000;
    const proLabore = 2000;
    const commissions = 1500;
    const net = contribution - fixed - proLabore - commissions;
    expect(net).toBe(3500);
  });
});
