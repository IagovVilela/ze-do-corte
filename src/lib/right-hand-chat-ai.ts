import "server-only";

import {
  callAdminAiChat,
  isAdminAiEnabled,
} from "@/lib/admin-ai-llm";
import type { RightHandFacts } from "@/lib/admin-right-hand-types";

export type ChatTurn = { role: "user" | "assistant"; content: string };

function rulesAnswer(question: string, facts: RightHandFacts): string {
  const q = question.toLowerCase();
  const k = facts.kpis;
  if (/receita|caiu|queda|fatur/.test(q)) {
    const rev = facts.compare.find((c) => c.key === "revenue");
    const delta =
      rev?.deltaPercent != null
        ? `${rev.deltaPercent > 0 ? "+" : ""}${rev.deltaPercent}%`
        : "sem base anterior";
    return `Receita no período (${facts.periodLabel}): R$ ${k.revenue.toFixed(2)} (${k.paidCount} pagos). Variação vs anterior: ${delta}. Atendimentos: ${k.appointmentsHint}.`;
  }
  if (/cancel/.test(q)) {
    return `Taxa de cancelamento: ${k.cancelRate}%. Funil: ${facts.funnel.scheduled} agendados → ${facts.funnel.completed} concluídos → ${facts.funnel.paid} pagos.`;
  }
  if (/cliente|melhor|top|ltv/.test(q)) {
    return facts.retention.topSpendHint
      ? `Na fila de reativação, priorize: ${facts.retention.topSpendHint}. LTV histórico médio da base: ${k.estimatedLtv != null ? `R$ ${k.estimatedLtv.toFixed(2)}` : "ainda sem dados"}.`
      : `LTV histórico médio: ${k.estimatedLtv != null ? `R$ ${k.estimatedLtv.toFixed(2)}` : "ainda sem dados"}. Em risco/sumindo: ${k.atRiskClients}/${k.lostClients}.`;
  }
  if (/terça|semana|ocupa|demanda|promo/.test(q)) {
    return (
      facts.prediction?.detail ??
      facts.weakHeatHint ??
      "Ainda sem padrão claro de demanda fraca nas últimas semanas."
    );
  }
  return `Resumo (${facts.periodLabel}): receita R$ ${k.revenue.toFixed(2)}, ${k.appointmentsHint}, ticket médio R$ ${k.avgTicket.toFixed(2)}, cancelamentos ${k.cancelRate}%. Pergunte sobre receita, cancelamentos, clientes ou demanda.`;
}

export async function answerRightHandChat(options: {
  question: string;
  facts: RightHandFacts;
  history?: ChatTurn[];
}): Promise<{ answer: string; source: "llm" | "rules" }> {
  const { question, facts, history = [] } = options;
  if (!isAdminAiEnabled()) {
    return { answer: rulesAnswer(question, facts), source: "rules" };
  }

  const system = `Você é o braço direito do dono de barbearia (pt-BR).
Responda só com base no JSON de facts abaixo. Não invente números.
Sem telefones/CPF. Seja direto (3–8 frases). Se a pergunta não couber nos facts, diga o que falta.
Facts:
${JSON.stringify(facts)}`;

  const historyLines = history
    .slice(-6)
    .map((t) => `${t.role === "user" ? "Dono" : "Consultor"}: ${t.content}`)
    .join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const content = await Promise.race([
      callAdminAiChat({
        system,
        user: `${historyLines ? `Histórico:\n${historyLines}\n\n` : ""}Pergunta: ${question}`,
        temperature: 0.3,
      }),
      new Promise<null>((resolve) => {
        controller.signal.addEventListener("abort", () => resolve(null));
      }),
    ]);
    if (!content?.trim()) {
      return { answer: rulesAnswer(question, facts), source: "rules" };
    }
    return { answer: content.trim(), source: "llm" };
  } finally {
    clearTimeout(timer);
  }
}

export { isAdminAiEnabled as isRightHandChatAiEnabled };
