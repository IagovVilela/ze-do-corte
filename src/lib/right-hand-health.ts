/**
 * Semáforos da Visão Geral do Braço Direito.
 */

import type {
  RightHandHealth,
  RightHandHealthTone,
  RightHandSnapshot,
} from "@/lib/admin-right-hand-types";
import {
  formatDeltaPercent,
  formatDeltaPoints,
} from "@/lib/right-hand-metrics";
import type { ConfidenceLevel } from "@/lib/right-hand-confidence";
import { volumeConfidence } from "@/lib/right-hand-confidence";

function toneMax(
  a: RightHandHealthTone,
  b: RightHandHealthTone,
): RightHandHealthTone {
  const order: RightHandHealthTone[] = ["green", "yellow", "red"];
  return order[Math.max(order.indexOf(a), order.indexOf(b))]!;
}

function money(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function compareVariation(
  rev: RightHandSnapshot["compare"][number] | undefined,
): string {
  if (!rev) return "sem base de comparação ainda";
  if (
    rev.deltaReason === "no_baseline" ||
    rev.deltaReason === "insufficient_maturity" ||
    rev.deltaPercent == null
  ) {
    return "sem base de comparação ainda";
  }
  return rev.deltaMode === "points"
    ? formatDeltaPoints(rev.deltaPercent)
    : formatDeltaPercent(rev.deltaPercent);
}

export function computeRightHandHealth(
  snapshot: Pick<
    RightHandSnapshot,
    "kpis" | "compare" | "funnel" | "prediction" | "facts" | "confidence" | "periodLabel"
  >,
): RightHandHealth {
  const k = snapshot.kpis;
  const rev = snapshot.compare.find((c) => c.key === "revenue");
  const appt = snapshot.compare.find((c) => c.key === "appointments");
  const conf = snapshot.confidence;
  const vol: ConfidenceLevel =
    conf.volume ?? volumeConfidence(k.paidCount);
  const periodHint = snapshot.periodLabel || "o período";

  let finance: RightHandHealthTone = "green";
  let financeDetail = `Leitura para ${periodHint}.`;
  if (k.appointments > 0 && k.revenue === 0) {
    finance = "red";
    financeDetail =
      "Há volume sem receita registrada (pagamentos em aberto).";
  } else if (k.completedUnpaid >= 3) {
    finance = toneMax(finance, "yellow");
    financeDetail = `${k.completedUnpaid} concluídos ainda sem pagamento.`;
  }
  if (rev?.deltaPercent != null && rev.deltaPercent <= -12) {
    finance = "red";
    financeDetail = `Receita caiu ${Math.abs(rev.deltaPercent)}% vs período anterior.`;
  } else if (rev?.deltaPercent != null && rev.deltaPercent <= -5) {
    finance = toneMax(finance, "yellow");
    financeDetail = `Receita em leve queda (${rev.deltaPercent}%).`;
  } else if (
    rev?.deltaPercent != null &&
    rev.deltaPercent >= 0 &&
    finance === "green"
  ) {
    financeDetail = "Receita estável ou em alta vs período anterior.";
  } else if (
    (rev?.deltaReason === "no_baseline" ||
      rev?.deltaReason === "insufficient_maturity") &&
    k.revenue > 0 &&
    finance === "green"
  ) {
    finance = toneMax(finance, "yellow");
    financeDetail = `Ainda pouca base histórica para ${periodHint.toLowerCase()}.`;
  } else if (k.revenue === 0 && k.paidCount === 0) {
    finance = "red";
    financeDetail = `Receita R$ 0 no período — abaixo do esperado para ${periodHint.toLowerCase()}.`;
  }

  const financeVariation = compareVariation(rev);

  let retention: RightHandHealthTone = "green";
  const risk = k.atRiskClients + k.lostClients;
  const activeProxy = Math.max(
    1,
    k.newClients + k.recurringClients + risk,
  );
  const riskShare = Math.round((risk / activeProxy) * 100);
  let retentionDetail = "Fila de reativação sob controle.";
  if (k.lostClients >= 5 || risk >= 10 || riskShare >= 40) {
    retention = "red";
    retentionDetail = `${k.lostClients} sumindo / ${k.atRiskClients} em risco (~${riskShare}% da base ativa no recorte) — reative agora.`;
  } else if (risk >= 3 || riskShare >= 20) {
    retention = "yellow";
    retentionDetail = `${risk} cliente(s) pedem atenção (~${riskShare}% da base no recorte).`;
  }

  let occupancy: RightHandHealthTone = "green";
  let occupancyDetail = "Demanda sem buracos extremos detectados.";
  let occupancyMetric = appt
    ? `${Math.round(appt.current)} atendimento(s)`
    : `${k.appointments} atendimento(s)`;
  let occupancyVariation = compareVariation(appt);

  if (snapshot.prediction && conf.prediction === "conclusive") {
    occupancy = "red";
    occupancyDetail = snapshot.prediction.detail;
    occupancyMetric = snapshot.prediction.weakWeekdayLabel;
    occupancyVariation = `~${snapshot.prediction.weakAvg} méd.`;
  } else if (snapshot.facts.weakHeatHint) {
    occupancy = "yellow";
    occupancyDetail = snapshot.facts.weakHeatHint;
  }

  return {
    finance: {
      tone: finance,
      metric: money(k.revenue),
      variation: financeVariation,
      detail: financeDetail,
      href: "/admin/inteligencia?view=analise#tendencia",
      confidence: vol,
    },
    retention: {
      tone: retention,
      metric: `${k.atRiskClients} em risco / ${k.lostClients} sumindo`,
      variation:
        risk === 0
          ? "nenhum na fila acionável"
          : `${risk} na fila · ~${riskShare}% do recorte`,
      detail: retentionDetail,
      href: "/admin/inteligencia?view=analise#reativacao",
      confidence: vol,
    },
    occupancy: {
      tone: occupancy,
      metric: occupancyMetric,
      variation: occupancyVariation,
      detail: occupancyDetail,
      href: "/admin/inteligencia?view=analise#demanda-fraca",
      confidence: vol,
    },
  };
}
