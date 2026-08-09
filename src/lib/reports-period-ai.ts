import "server-only";

import {
  callAdminAiChat,
  isAdminAiEnabled,
  parseAiJsonObject,
} from "@/lib/admin-ai-llm";
import type { AdminReportsSnapshot } from "@/lib/admin-reports";

export type ReportsPeriodFacts = {
  generatedAt: string;
  organizationId: string;
  periodLabel: string;
  range: string;
  metrics: {
    receivedInPeriod: number;
    completedValueInPeriod: number;
    scheduledValueInPeriod: number;
    pendingPaymentTotal: number;
    avgTicket: number;
    cancelRate: number;
    completionRate: number;
    productRevenueInPeriod: number;
    totalAppointments: number;
    distinctClients: number;
  };
  topOrigins: { label: string; percent: number }[];
  topStaff: { label: string; received: number; completed: number }[];
  club: {
    active: number;
    pastDue: number;
    paused: number;
  } | null;
};

export type ReportsPeriodNarrative = {
  summary: string;
  actions: [string, string, string];
  /** Links opcionais alinhados às 3 ações. */
  actionHrefs: [string, string, string];
  source: "llm" | "rules";
};

export function buildReportsPeriodFacts(
  snapshot: AdminReportsSnapshot,
  organizationId: string,
): ReportsPeriodFacts {
  return {
    generatedAt: new Date().toISOString(),
    organizationId,
    periodLabel: snapshot.periodLabel,
    range: snapshot.range,
    metrics: {
      receivedInPeriod: snapshot.metrics.receivedInPeriod,
      completedValueInPeriod: snapshot.metrics.completedValueInPeriod,
      scheduledValueInPeriod: snapshot.metrics.scheduledValueInPeriod,
      pendingPaymentTotal: snapshot.metrics.pendingPaymentTotal,
      avgTicket: snapshot.avgTicket,
      cancelRate: snapshot.cancelRate,
      completionRate: snapshot.completionRate,
      productRevenueInPeriod: snapshot.productRevenueInPeriod,
      totalAppointments: snapshot.metrics.totalAppointments,
      distinctClients: snapshot.metrics.distinctClients,
    },
    topOrigins: snapshot.bookingOrigins.slice(0, 3).map((o) => ({
      label: o.label,
      percent: o.percent,
    })),
    topStaff: snapshot.staffRanking.slice(0, 3).map((s) => ({
      label: s.label,
      received: s.received,
      completed: s.completed,
    })),
    club: snapshot.club
      ? {
          active: snapshot.club.active,
          pastDue: snapshot.club.pastDue,
          paused: snapshot.club.paused,
        }
      : null,
  };
}

function money(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function rulesFallback(facts: ReportsPeriodFacts): ReportsPeriodNarrative {
  const m = facts.metrics;
  const parts: string[] = [];
  parts.push(
    `No período (${facts.periodLabel}): ${m.totalAppointments} agendamentos, ${m.distinctClients} clientes.`,
  );
  parts.push(
    `Recebido ${money(m.receivedInPeriod)} · ticket médio ${money(m.avgTicket)} · cancelamento ${m.cancelRate}%.`,
  );
  if (m.pendingPaymentTotal > 0) {
    parts.push(
      `Ainda há ${money(m.pendingPaymentTotal)} pendente de registro de pagamento.`,
    );
  }
  if (facts.topOrigins[0]) {
    parts.push(
      `Principal origem: ${facts.topOrigins[0].label} (${facts.topOrigins[0].percent}%).`,
    );
  }
  if (facts.club && facts.club.pastDue > 0) {
    parts.push(`Clube: ${facts.club.pastDue} em atraso.`);
  }

  const actions: [string, string, string] = [
    m.pendingPaymentTotal > 0
      ? "Feche comandas a receber no Operacional."
      : "Mantenha o caixa do dia registrado no ato.",
    m.cancelRate >= 12
      ? "Reduza cancelamentos: confirme WhatsApp e lembrete 24h."
      : "Reforce indicação e retorno dos clientes fiéis.",
    facts.club && facts.club.pastDue > 0
      ? "Regularize assinaturas PAST_DUE do clube."
      : "Olhe o ranking da equipe e metas do mês.",
  ];

  const actionHrefs: [string, string, string] = [
    m.pendingPaymentTotal > 0
      ? "/admin/operacional#a-receber"
      : "/admin/caixa",
    m.cancelRate >= 12 ? "/admin/whatsapp" : "/admin/clientes?risk=actionable",
    facts.club && facts.club.pastDue > 0
      ? "/admin/clube"
      : "/admin/financeiro/comissoes",
  ];

  return {
    summary: parts.join(" "),
    actions,
    actionHrefs,
    source: "rules",
  };
}

async function llmNarrative(
  facts: ReportsPeriodFacts,
): Promise<ReportsPeriodNarrative | null> {
  const system = `Você é um analista de operação de barbearia no Brasil.
Responda SOMENTE JSON: {"summary":"...","actions":["...","...","..."]}.
summary: 3–5 frases curtas com leitura do período (use só os facts).
actions: exatamente 3 ações práticas para o dono. pt-BR, direto, sem inventar números.`;

  const content = await callAdminAiChat({
    system,
    user: `Facts do período (sem PII):\n${JSON.stringify(facts)}`,
    temperature: 0.4,
  });
  if (!content) return null;

  const parsed = parseAiJsonObject(content) as {
    summary?: unknown;
    actions?: unknown;
  } | null;
  if (!parsed || typeof parsed.summary !== "string") return null;
  if (!Array.isArray(parsed.actions) || parsed.actions.length < 3) return null;
  const a = parsed.actions
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, 3);
  if (a.length < 3) return null;

  return {
    summary: parsed.summary.trim(),
    actions: [a[0]!, a[1]!, a[2]!],
    actionHrefs: inferActionHrefs(facts),
    source: "llm",
  };
}

function inferActionHrefs(
  facts: ReportsPeriodFacts,
): [string, string, string] {
  const m = facts.metrics;
  return [
    m.pendingPaymentTotal > 0
      ? "/admin/operacional#a-receber"
      : "/admin/caixa",
    m.cancelRate >= 12 ? "/admin/whatsapp" : "/admin/clientes?risk=actionable",
    facts.club && facts.club.pastDue > 0
      ? "/admin/clube"
      : "/admin/financeiro/comissoes",
  ];
}

export async function generateReportsPeriodNarrative(
  facts: ReportsPeriodFacts,
): Promise<ReportsPeriodNarrative> {
  if (isAdminAiEnabled()) {
    const llm = await llmNarrative(facts);
    if (llm) return llm;
  }
  return rulesFallback(facts);
}

export { isAdminAiEnabled as isReportsPeriodAiEnabled };
