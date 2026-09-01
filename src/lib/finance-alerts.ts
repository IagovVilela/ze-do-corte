import "server-only";

import { format, startOfMonth } from "date-fns";

import { buildBreakEvenSnapshot } from "@/lib/finance-break-even";
import { getProjectedBalanceNegative } from "@/lib/finance-cashflow";
import { countServicesBelowCost } from "@/lib/service-costing-admin";

export type FinanceGerencialAlert = {
  id: string;
  severity: "warning" | "danger" | "info";
  title: string;
  description: string;
  href?: string;
};

export async function getFinanceGerencialAlerts(
  organizationId: string,
): Promise<FinanceGerencialAlert[]> {
  const alerts: FinanceGerencialAlert[] = [];
  const yearMonth = format(startOfMonth(new Date()), "yyyy-MM");

  const belowCost = await countServicesBelowCost(organizationId);
  if (belowCost > 0) {
    alerts.push({
      id: "services-below-cost",
      severity: "danger",
      title: `${belowCost} serviço(s) abaixo do custo`,
      description:
        "Há serviços com preço de venda menor que o CSV calculado. Revise a precificação.",
      href: "/admin/financeiro/precificacao",
    });
  }

  try {
    const pe = await buildBreakEvenSnapshot({
      organizationId,
      yearMonth,
    });
    if (pe.breakEvenUnits > 0 && pe.progressPercent < 100) {
      alerts.push({
        id: "break-even",
        severity: pe.progressPercent < 50 ? "warning" : "info",
        title: `Ponto de equilíbrio: ${pe.progressPercent}% do mês`,
        description: `Faltam ${Math.max(0, pe.breakEvenUnits - pe.actualUnits)} atendimentos para cobrir custos fixos.`,
        href: "/admin/financeiro/ponto-equilibrio",
      });
    }
  } catch {
    // ignore
  }

  const negativeProjection = await getProjectedBalanceNegative(organizationId);
  if (negativeProjection) {
    alerts.push({
      id: "cashflow-negative",
      severity: "warning",
      title: "Saldo projetado pode ficar negativo",
      description:
        "Com contas em aberto, o fluxo de caixa indica risco nos próximos 30 dias.",
      href: "/admin/financeiro/fluxo-caixa",
    });
  }

  return alerts;
}
