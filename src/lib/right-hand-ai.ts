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
  "/admin/inteligencia#funil",
  "/admin/inteligencia#tendencia",
  "/admin/inteligencia#fila-acoes",
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

function safeHref(href: string, fallback = "/admin/inteligencia#fila-acoes"): string {
  const t = href.trim();
  return ALLOWED_HREFS.has(t) ? t : fallback;
}

/** Narrative a partir da actionQueue já ranqueada (regras). */
function rulesFallback(facts: RightHandFacts): RightHandNarrative {
  const k = facts.kpis;
  const queue = facts.actionQueue;
  const top = queue[0];
  const urgent: RightHandInsightItem = top
    ? { title: top.title, detail: top.detail, href: top.href }
    : {
        title: "Operação estável",
        detail: "Revise a agenda e compartilhe o link de agendar.",
        href: "/admin/marca",
      };

  const opportunities = queue.slice(1, 4).map((a) => ({
    title: a.title,
    detail: a.detail,
    href: a.href,
  }));

  const parts = [
    `${facts.periodLabel}: receita ${money(k.revenue)} (${k.paidCount} pagos), ${k.appointmentsHint}.`,
  ];
  if (top?.estimatedImpactBrl != null) {
    parts.push(`Prioridade: ${top.title} (~${money(top.estimatedImpactBrl)}).`);
  }

  return {
    summary: parts.join(" "),
    urgent,
    opportunities,
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
Use a actionQueue dos facts (já ranqueada) — reescreva títulos/details em tom direto, sem inventar números.
urgent = ação rank 1; opportunities = ranks 2–4.
href deve ser um destes: ${[...ALLOWED_HREFS].join(", ")}
Sem telefones/CPF.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const content = await Promise.race([
      callAdminAiChat({
        system,
        user: `Facts:\n${JSON.stringify({
          ...facts,
          actionQueue: facts.actionQueue,
        })}`,
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
  const dayKey = `${dayKeyFromFacts(facts)}:${facts.range}:v3`;
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
