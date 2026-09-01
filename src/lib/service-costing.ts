/**
 * Cálculos de CSV (custo do serviço vendido) e PV (preço de venda).
 * Fórmulas do workshop: CSV = MOD + MAT + DF; PV = CSV / (1 - DV% - ML%).
 */

export type ServiceCostInputs = {
  directLaborCost: number;
  materialCost: number;
  durationMinutes: number;
  fixedCostPerHour: number;
};

export type ServiceCostResult = {
  directLaborCost: number;
  materialCost: number;
  fixedCostAllocated: number;
  csvTotal: number;
  durationMinutes: number;
  fixedCostPerHour: number;
};

export type SellingPriceResult = {
  csvTotal: number;
  variablePercent: number;
  profitPercent: number;
  suggestedPrice: number;
  denominator: number;
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeFixedCostPerHour(
  monthlyFixedCosts: number,
  productiveHours: number,
): number {
  const hours = Math.max(1, productiveHours);
  return roundMoney(Math.max(0, monthlyFixedCosts) / hours);
}

export function computeFixedCostAllocated(
  fixedCostPerHour: number,
  durationMinutes: number,
): number {
  const hours = Math.max(0, durationMinutes) / 60;
  return roundMoney(Math.max(0, fixedCostPerHour) * hours);
}

export function computeServiceCost(
  inputs: ServiceCostInputs,
): ServiceCostResult {
  const mod = Math.max(0, inputs.directLaborCost);
  const mat = Math.max(0, inputs.materialCost);
  const df = computeFixedCostAllocated(
    inputs.fixedCostPerHour,
    inputs.durationMinutes,
  );
  return {
    directLaborCost: mod,
    materialCost: mat,
    fixedCostAllocated: df,
    csvTotal: roundMoney(mod + mat + df),
    durationMinutes: inputs.durationMinutes,
    fixedCostPerHour: inputs.fixedCostPerHour,
  };
}

export function computeSellingPrice(
  csvTotal: number,
  variablePercent: number,
  profitPercent: number,
): SellingPriceResult {
  const dv = Math.min(100, Math.max(0, variablePercent));
  const ml = Math.min(100, Math.max(0, profitPercent));
  const denominator = 1 - (dv + ml) / 100;
  const safeDenominator = denominator <= 0 ? 0.01 : denominator;
  return {
    csvTotal: roundMoney(Math.max(0, csvTotal)),
    variablePercent: dv,
    profitPercent: ml,
    suggestedPrice: roundMoney(Math.max(0, csvTotal) / safeDenominator),
    denominator: safeDenominator,
  };
}

export function computePriceGap(currentPrice: number, suggestedPrice: number): {
  gap: number;
  belowCost: boolean;
} {
  const gap = roundMoney(suggestedPrice - currentPrice);
  return {
    gap,
    belowCost: currentPrice < suggestedPrice,
  };
}

/** Exemplo do workshop: CSV 458,96 → PV 655,66 com DV 10% e ML 20%. */
export function workshopExampleCheck(): boolean {
  const csv = computeServiceCost({
    directLaborCost: 153.84,
    materialCost: 100,
    durationMinutes: 480,
    fixedCostPerHour: 25.64,
  });
  const pv = computeSellingPrice(csv.csvTotal, 10, 20);
  return (
    Math.abs(csv.csvTotal - 458.96) < 0.02 &&
    Math.abs(pv.suggestedPrice - 655.66) < 0.02
  );
}
