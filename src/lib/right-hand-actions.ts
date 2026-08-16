/**
 * Fila de ação priorizada por impacto (regras) — Braço Direito.
 */

import type {
  RightHandAction,
  RightHandFacts,
  RightHandRetentionClient,
} from "@/lib/admin-right-hand-types";
import { RH_THRESHOLDS } from "@/lib/right-hand-confidence";

function moneyRound(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildRightHandActionQueue(opts: {
  facts: RightHandFacts;
  retentionQueue: RightHandRetentionClient[];
}): RightHandAction[] {
  const { facts, retentionQueue } = opts;
  const k = facts.kpis;
  const actions: RightHandAction[] = [];
  const rev = facts.compare.find((c) => c.key === "revenue");

  if (retentionQueue.length > 0 || k.atRiskClients + k.lostClients > 0) {
    const topSpend = retentionQueue
      .filter((c) => (c.totalSpent ?? 0) > 0)
      .sort((a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0))
      .slice(0, 5);
    const impact =
      topSpend.length > 0
        ? moneyRound(
            topSpend.reduce((s, c) => s + (c.totalSpent ?? 0), 0) * 0.3,
          )
        : moneyRound((k.estimatedLtv ?? k.avgTicket) * Math.max(1, retentionQueue.length) * 0.25);
    const top = topSpend[0] ?? retentionQueue[0];
    actions.push({
      id: "winback",
      rank: 0,
      title: top
        ? `Reativar ${top.name.split(/\s+/)[0]}`
        : "Reativar clientes em risco",
      detail: top
        ? `${k.atRiskClients + k.lostClients} na fila · ${top.totalSpent != null ? `R$ ${top.totalSpent.toFixed(0)} histórico em risco` : "priorize WhatsApp"}.`
        : `${k.atRiskClients} em risco / ${k.lostClients} sumindo.`,
      href: "/admin/inteligencia#reativacao",
      estimatedImpactBrl: impact > 0 ? impact : null,
      impactBasis: "30% do gasto histórico dos top da fila",
      confidence:
        retentionQueue.length >= 3 || k.lostClients >= 2 ? "high" : "med",
      score: 80 + k.lostClients * 2 + k.atRiskClients,
      kind: "winback",
      proofChart: "retention",
    });
  }

  if (k.completedUnpaid >= 1) {
    const impact = moneyRound(k.completedUnpaid * (k.avgTicket || 50));
    actions.push({
      id: "cash_unpaid",
      rank: 0,
      title: `${k.completedUnpaid} concluído(s) sem pagamento`,
      detail: "Registre o caixa em Operacional — dinheiro já feito, não recebido.",
      href: "/admin/operacional#a-receber",
      estimatedImpactBrl: impact,
      impactBasis: "concluídos sem paidAt × ticket médio",
      confidence: "high",
      score: 90 + Math.min(50, impact / 20),
      kind: "cash",
      proofChart: "funnel",
    });
  }

  const paidRate =
    facts.funnel.scheduled > 0
      ? facts.funnel.paid / facts.funnel.scheduled
      : 1;
  if (
    facts.funnel.scheduled >= RH_THRESHOLDS.funnelMinAppointments &&
    paidRate < 0.5
  ) {
    actions.push({
      id: "funnel_paid",
      rank: 0,
      title: "Funil trava antes do pagamento",
      detail: `${facts.funnel.completed} concluídos → ${facts.funnel.paid} pagos. Aqui a operação está perdendo caixa.`,
      href: "/admin/inteligencia#funil",
      estimatedImpactBrl: moneyRound(
        Math.max(0, facts.funnel.completed - facts.funnel.paid) *
          (k.avgTicket || 50),
      ),
      impactBasis: "gap concluído−pago × ticket",
      confidence: "med",
      score: 78,
      kind: "funnel",
      proofChart: "funnel",
    });
  }

  if (
    k.cancelRate >= 12 &&
    k.appointments >= RH_THRESHOLDS.cancelInsightMinAppointments
  ) {
    const cancelledApprox = Math.round((k.cancelRate / 100) * k.appointments);
    actions.push({
      id: "cancel",
      rank: 0,
      title: `Cancelamentos em ${k.cancelRate}%`,
      detail: "Revise lembretes WhatsApp e confirmação antes de abrir mais agenda.",
      href: "/admin/whatsapp",
      estimatedImpactBrl: moneyRound(cancelledApprox * (k.avgTicket || 50) * 0.5),
      impactBasis: "cancelados × ticket × 50%",
      confidence: "med",
      score: 76,
      kind: "cancel",
      proofChart: "compare",
    });
  }

  if (rev?.deltaPercent != null && rev.deltaPercent <= -12) {
    actions.push({
      id: "revenue_drop",
      rank: 0,
      title: `Receita caiu ${Math.abs(rev.deltaPercent)}%`,
      detail: `Atual R$ ${rev.current.toFixed(0)} · anterior R$ ${rev.previous.toFixed(0)}.`,
      href: "/admin/inteligencia#tendencia",
      estimatedImpactBrl: moneyRound(Math.abs(rev.current - rev.previous)),
      impactBasis: "|Δ receita| do período",
      confidence: "high",
      score: 72 + Math.min(20, Math.abs(rev.deltaPercent) / 2),
      kind: "cash",
      proofChart: "revenue",
    });
  }

  if (facts.weakHeatHint || facts.promoSuggestion) {
    actions.push({
      id: "weak_slot",
      rank: 0,
      title: "Preencher horário fraco",
      detail:
        facts.weakHeatHint ??
        facts.promoSuggestion?.detail ??
        "Há ociosidade recorrente no mapa de demanda.",
      href: "/admin/inteligencia#demanda-fraca",
      estimatedImpactBrl: moneyRound((k.avgTicket || 50) * 2),
      impactBasis: "~2 tickets de promoção no slot fraco",
      confidence: facts.prediction ? "med" : "low",
      score: 65,
      kind: "slot",
      proofChart: "heatmap",
    });
  }

  if (facts.topStaff[0] && facts.topStaff[0].completed >= 3) {
    const s = facts.topStaff[0];
    actions.push({
      id: "staff_boost",
      rank: 0,
      title: `Reconhecer ${s.label.split(/\s+/)[0]}`,
      detail: `${s.completed} concluídos · R$ ${s.received.toFixed(0)} — peça indicação dos clientes fiéis.`,
      href: "/admin/financeiro/comissoes",
      estimatedImpactBrl: moneyRound(s.received * 0.1),
      impactBasis: "10% do recebido do destaque (indicação)",
      confidence: "low",
      score: 55,
      kind: "staff",
      proofChart: null,
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: "share_booking",
      rank: 0,
      title: "Compartilhe o link de agendar",
      detail: "Mais agenda online alimenta o comparativo da próxima semana.",
      href: "/admin/marca",
      estimatedImpactBrl: null,
      impactBasis: "",
      confidence: "low",
      score: 40,
      kind: "promo",
      proofChart: null,
    });
  }

  actions.sort((a, b) => b.score - a.score);
  return actions.slice(0, 5).map((a, i) => ({ ...a, rank: i + 1 }));
}
