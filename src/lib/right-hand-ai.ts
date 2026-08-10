import "server-only";

import {
  callAdminAiChat,
  isAdminAiEnabled,
  parseAiJsonObject,
} from "@/lib/admin-ai-llm";
import type { RightHandFacts } from "@/lib/admin-right-hand-types";

export type RightHandInsightItem = {
  title: string;
  detail: string;
  href: string;
};

export type RightHandNarrative = {
  summary: string;
  urgent: RightHandInsightItem;
  opportunities: RightHandInsightItem[];
  source: "llm" | "rules";
  cached: boolean;
};

type CacheEntry = {
  dayKey: string;
  narrative: RightHandNarrative;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function dayKeyFromFacts(facts: RightHandFacts): string {
  return facts.generatedAt.slice(0, 10);
}

function money(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ALLOWED_HREFS = new Set([
  "/admin/inteligencia#reativacao",
  "/admin/inteligencia#demanda-fraca",
  "/admin/clientes?risk=actionable",
  "/admin/clientes?risk=lost",
  "/admin/agendamentos",
  "/admin/operacional#a-receber",
  "/admin/whatsapp",
  "/admin/clube",
  "/admin/financeiro/comissoes",
  "/admin/relatorios",
  "/admin/marca",
]);

function safeHref(href: string, fallback = "/admin/inteligencia#reativacao"): string {
  const t = href.trim();
  return ALLOWED_HREFS.has(t) ? t : fallback;
}

function rulesFallback(facts: RightHandFacts): RightHandNarrative {
  const k = facts.kpis;
  const rev = facts.compare.find((c) => c.key === "revenue");

  let urgent: RightHandInsightItem;
  if (k.lostClients + k.atRiskClients > 0) {
    urgent = {
      title: `${k.lostClients + k.atRiskClients} cliente(s) pedem reativação`,
      detail: facts.retention.topSpendHint
        ? `Priorize quem mais gerou receita: ${facts.retention.topSpendHint}. Use Mensagem IA abaixo.`
        : "Na fila de reativação abaixo, gere a mensagem e abra o WhatsApp.",
      href: "/admin/inteligencia#reativacao",
    };
  } else if (k.cancelRate >= 12) {
    urgent = {
      title: `Cancelamentos em ${k.cancelRate}% no período`,
      detail:
        "Confirme lembretes WhatsApp e revise no-shows antes de abrir mais agenda.",
      href: "/admin/whatsapp",
    };
  } else if (rev && rev.deltaPercent != null && rev.deltaPercent <= -12) {
    urgent = {
      title: `Receita caiu ${Math.abs(rev.deltaPercent)}% vs período anterior`,
      detail: `Atual ${money(rev.current)} · anterior ${money(rev.previous)}. Olhe ocupação e ticket.`,
      href: "/admin/relatorios",
    };
  } else {
    urgent = {
      title: "Operação estável — foque em preencher horários fracos",
      detail: facts.weakHeatHint
        ? `Padrão fraco: ${facts.weakHeatHint}.`
        : "Revise a agenda e incentive indicação dos clientes fiéis.",
      href: "/admin/agendamentos",
    };
  }

  const opportunities: RightHandInsightItem[] = [];
  if (facts.weakHeatHint) {
    opportunities.push({
      title: "Horário com baixa demanda",
      detail: `${facts.weakHeatHint}. Considere promoção pontual ou realocar equipe.`,
      href: "/admin/inteligencia#demanda-fraca",
    });
  }
  if (k.lostClients > 0) {
    opportunities.push({
      title: "Campanha de reativação",
      detail: `${k.lostClients} sumindo (60d+). Use Mensagem IA na fila desta página.`,
      href: "/admin/inteligencia#reativacao",
    });
  }
  if (facts.topStaff[0]) {
    opportunities.push({
      title: `Destaque: ${facts.topStaff[0].label}`,
      detail: `${facts.topStaff[0].completed} concluídos · ${money(facts.topStaff[0].received)} recebidos — reconheça e peça indicação.`,
      href: "/admin/financeiro/comissoes",
    });
  }
  if (opportunities.length < 2) {
    opportunities.push({
      title: "Compartilhe o link de agendar",
      detail: "Mais agenda online reduz ociosidade e melhora o comparativo da próxima semana.",
      href: "/admin/marca",
    });
  }

  const parts = [
    `${facts.periodLabel}: receita ${money(k.revenue)} (${k.paidCount} pagos), ${k.appointmentsHint}, ticket ${money(k.avgTicket)}.`,
  ];
  if (rev?.deltaPercent != null && facts.maturity !== "insufficient") {
    parts.push(
      `Vs anterior: ${rev.deltaPercent > 0 ? "+" : ""}${rev.deltaPercent}%.`,
    );
  }
  if (k.atRiskClients + k.lostClients > 0) {
    parts.push(
      `Retenção: ${k.atRiskClients} em risco, ${k.lostClients} sumindo.`,
    );
  }

  return {
    summary: parts.join(" "),
    urgent,
    opportunities: opportunities.slice(0, 3),
    source: "rules",
    cached: false,
  };
}

async function llmNarrative(
  facts: RightHandFacts,
): Promise<RightHandNarrative | null> {
  const system = `Você é o braço direito do dono de barbearia no Brasil.
Responda SOMENTE JSON:
{"summary":"...","urgent":{"title":"...","detail":"...","href":"..."},"opportunities":[{"title":"...","detail":"...","href":"..."}]}
Regras: pt-BR, tom de consultor direto, summary 2–4 frases.
urgent: exatamente 1 ação prioritária de hoje.
opportunities: 2 ou 3 itens.
href deve ser um destes: /admin/inteligencia#reativacao, /admin/inteligencia#demanda-fraca, /admin/clientes?risk=actionable, /admin/clientes?risk=lost, /admin/agendamentos, /admin/operacional#a-receber, /admin/whatsapp, /admin/clube, /admin/financeiro/comissoes, /admin/relatorios, /admin/marca
Não invente números. Sem telefones/CPF. Sem jargão longo. Preferir #reativacao quando a ação for WhatsApp de retorno.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const content = await Promise.race([
      callAdminAiChat({
        system,
        user: `Facts do Braço Direito:\n${JSON.stringify(facts)}`,
        temperature: 0.4,
      }),
      new Promise<null>((resolve) => {
        controller.signal.addEventListener("abort", () => resolve(null));
      }),
    ]);
    if (!content) return null;

    const parsed = parseAiJsonObject(content) as {
      summary?: unknown;
      urgent?: { title?: unknown; detail?: unknown; href?: unknown };
      opportunities?: unknown;
    } | null;
    if (!parsed || typeof parsed.summary !== "string") return null;
    if (
      !parsed.urgent ||
      typeof parsed.urgent.title !== "string" ||
      typeof parsed.urgent.detail !== "string" ||
      typeof parsed.urgent.href !== "string"
    ) {
      return null;
    }
    const opps = Array.isArray(parsed.opportunities)
      ? parsed.opportunities
          .filter(
            (o): o is { title: string; detail: string; href: string } =>
              !!o &&
              typeof o === "object" &&
              typeof (o as { title?: unknown }).title === "string" &&
              typeof (o as { detail?: unknown }).detail === "string" &&
              typeof (o as { href?: unknown }).href === "string",
          )
          .slice(0, 3)
      : [];
    if (opps.length < 1) return null;

    return {
      summary: parsed.summary.trim(),
      urgent: {
        title: parsed.urgent.title.trim(),
        detail: parsed.urgent.detail.trim(),
        href: safeHref(parsed.urgent.href),
      },
      opportunities: opps.map((o) => ({
        title: o.title.trim(),
        detail: o.detail.trim(),
        href: safeHref(o.href, "/admin/agendamentos"),
      })),
      source: "llm",
      cached: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function generateRightHandNarrative(
  facts: RightHandFacts,
  opts?: { forceRefresh?: boolean },
): Promise<RightHandNarrative> {
  const dayKey = `${dayKeyFromFacts(facts)}:${facts.range}`;
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

  let narrative: RightHandNarrative | null = null;
  if (isAdminAiEnabled()) {
    narrative = await llmNarrative(facts);
  }
  if (!narrative) narrative = rulesFallback(facts);

  cache.set(cacheKey, {
    dayKey,
    narrative,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
  return narrative;
}

export { isAdminAiEnabled as isRightHandAiEnabled };
