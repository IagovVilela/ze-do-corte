/**
 * Faixas escalonadas de comissão sobre serviços avulsos.
 * Aplica a faixa com maior `minRevenue` cujo limiar o faturamento atinge.
 */

export type CommissionTier = {
  minRevenue: number;
  servicePercent: number;
};

export function parseCommissionTiers(raw: unknown): CommissionTier[] {
  if (!Array.isArray(raw)) return [];
  const out: CommissionTier[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const minRevenue = Number(row.minRevenue);
    const servicePercent = Number(row.servicePercent);
    if (!Number.isFinite(minRevenue) || minRevenue < 0) continue;
    if (!Number.isFinite(servicePercent) || servicePercent < 0 || servicePercent > 100) {
      continue;
    }
    out.push({ minRevenue, servicePercent });
  }
  return out.sort((a, b) => a.minRevenue - b.minRevenue);
}

/** Maior faixa cujo minRevenue ≤ revenue; senão null. */
export function resolveServicePercentFromTiers(
  tiers: CommissionTier[],
  revenue: number,
): number | null {
  if (tiers.length === 0) return null;
  let matched: CommissionTier | null = null;
  for (const t of tiers) {
    if (revenue >= t.minRevenue) matched = t;
  }
  return matched ? matched.servicePercent : null;
}
