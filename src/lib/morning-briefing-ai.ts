import "server-only";

import type { MorningBriefingFacts } from "@/lib/admin-morning-briefing";

export type MorningNarrative = {
  summary: string;
  positiveHypothesis: string;
  alertHypothesis: string;
  cached: boolean;
  source: "llm" | "rules";
};

type CacheEntry = {
  dayKey: string;
  narrative: MorningNarrative;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

export function isMorningBriefingAiEnabled(): boolean {
  const flag = process.env.MORNING_BRIEFING_AI_ENABLED?.trim().toLowerCase();
  if (flag !== "1" && flag !== "true" && flag !== "yes") return false;
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function dayKeyInTz(isoGeneratedAt: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(isoGeneratedAt));
  } catch {
    return isoGeneratedAt.slice(0, 10);
  }
}

function rulesFallback(facts: MorningBriefingFacts): MorningNarrative {
  const k = facts.kpis;
  const parts: string[] = [];
  parts.push(
    `Hoje: ${k.todayConfirmed} confirmado${k.todayConfirmed === 1 ? "" : "s"}, ${k.nextTwoHours} nas próximas 2h.`,
  );
  if (k.unpaidCount > 0) {
    parts.push(
      `Há ${k.unpaidCount} comanda${k.unpaidCount === 1 ? "" : "s"} a receber (R$ ${k.unpaidTotal.toFixed(2)}).`,
    );
  }
  if (k.lostClients + k.atRiskClients > 0) {
    parts.push(
      `Retenção: ${k.lostClients} sumindo e ${k.atRiskClients} em risco.`,
    );
  }
  if (k.clubPastDue > 0) {
    parts.push(`Clube: ${k.clubPastDue} em atraso.`);
  }
  if (k.lowStockCount > 0) {
    parts.push(`Estoque: ${k.lowStockCount} produto(s) no mínimo.`);
  }
  if (facts.goals?.behindCount && facts.goals.behindCount > 0) {
    parts.push(
      facts.goals.topHint
        ? `Metas: ${facts.goals.behindCount} abaixo de 70% (${facts.goals.topHint}).`
        : `Metas: ${facts.goals.behindCount} profissional(is) abaixo de 70%.`,
    );
  }
  if (k.receivedDeltaPercent != null) {
    parts.push(
      `Recebido 7d ${k.receivedDeltaPercent >= 0 ? "+" : ""}${k.receivedDeltaPercent}% vs semana anterior.`,
    );
  }

  const positive =
    k.receivedDeltaPercent != null && k.receivedDeltaPercent > 0
      ? "O ritmo de recebimento está acima da semana passada — boa hora para reforçar indicação e clube."
      : facts.topClientHint
        ? `Há recorrência forte no mês (${facts.topClientHint}) — cultive esses clientes.`
        : "Manter a agenda preenchida e o caixa em dia já sustenta o dia.";

  const alert =
    k.unpaidCount > 0 || k.lostClients > 0
      ? "Priorize caixa parado e clientes sumindo antes de abrir novas frentes."
      : k.receivedDeltaPercent != null && k.receivedDeltaPercent < -10
        ? "Queda no recebido dos últimos 7 dias — revise no-shows, preços e origem das reservas."
        : "Sem alerta crítico; monitore agenda e estoque ao longo do dia.";

  return {
    summary: parts.join(" "),
    positiveHypothesis: positive,
    alertHypothesis: alert,
    cached: false,
    source: "rules",
  };
}

async function callOpenAiNarrative(
  facts: MorningBriefingFacts,
): Promise<MorningNarrative | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model =
    process.env.MORNING_BRIEFING_AI_MODEL?.trim() || "gpt-4o-mini";
  const base =
    process.env.OPENAI_BASE_URL?.trim().replace(/\/$/, "") ||
    "https://api.openai.com/v1";

  const isGemini =
    base.includes("generativelanguage.googleapis.com") ||
    model.toLowerCase().startsWith("gemini");

  const system = `Você é um consultor de operação para donos de barbearia no Brasil.
Responda SOMENTE com JSON válido: {"summary":"...","positiveHypothesis":"...","alertHypothesis":"..."}.
Use português do Brasil, tom direto e acionável. summary: 4 a 6 frases curtas.
Não invente números — use só o JSON de facts. Não peça dados pessoais.`;

  const user = `Facts do dia (agregados, sem telefones):\n${JSON.stringify(facts)}`;

  const messages = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  async function post(withJsonObject: boolean) {
    const body: Record<string, unknown> = {
      model,
      temperature: 0.4,
      messages,
    };
    // Gemini (OpenAI compat) nem sempre aceita response_format.json_object.
    if (withJsonObject && !isGemini) {
      body.response_format = { type: "json_object" };
    }
    return fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  let res = await post(!isGemini);
  if (!res.ok && !isGemini) {
    // Fallback: alguns proxies rejeitam response_format.
    res = await post(false);
  }

  if (!res.ok) {
    console.error(
      "[morning-briefing-ai] LLM HTTP",
      res.status,
      await res.text().catch(() => ""),
    );
    return null;
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  let content = json.choices?.[0]?.message?.content?.trim();
  if (!content) return null;

  // Remove cercas ```json ... ``` se o modelo devolver markdown.
  const fence = content.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fence?.[1]) content = fence[1].trim();

  try {
    const parsed = JSON.parse(content) as {
      summary?: unknown;
      positiveHypothesis?: unknown;
      alertHypothesis?: unknown;
    };
    if (
      typeof parsed.summary !== "string" ||
      typeof parsed.positiveHypothesis !== "string" ||
      typeof parsed.alertHypothesis !== "string"
    ) {
      return null;
    }
    return {
      summary: parsed.summary.trim(),
      positiveHypothesis: parsed.positiveHypothesis.trim(),
      alertHypothesis: parsed.alertHypothesis.trim(),
      cached: false,
      source: "llm",
    };
  } catch {
    return null;
  }
}

/**
 * Narrativa do briefing: cache diário por organização; LLM se habilitado, senão regras.
 */
export async function generateMorningNarrative(
  facts: MorningBriefingFacts,
  opts?: { forceRefresh?: boolean },
): Promise<MorningNarrative> {
  const dayKey = dayKeyInTz(facts.generatedAt, facts.timezone);
  const cacheKey = `${facts.organizationId}:${dayKey}`;
  const hit = cache.get(cacheKey);
  if (
    !opts?.forceRefresh &&
    hit &&
    hit.dayKey === dayKey &&
    hit.expiresAt > Date.now()
  ) {
    return { ...hit.narrative, cached: true };
  }

  let narrative: MorningNarrative | null = null;
  if (isMorningBriefingAiEnabled()) {
    narrative = await callOpenAiNarrative(facts);
  }
  if (!narrative) {
    narrative = rulesFallback(facts);
  }

  // Expira no fim do dia civil da org (~24h de folga).
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  cache.set(cacheKey, { dayKey, narrative, expiresAt });
  return narrative;
}
