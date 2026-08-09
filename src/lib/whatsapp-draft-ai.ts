import "server-only";

import {
  callAdminAiChat,
  isAdminAiEnabled,
  parseAiJsonObject,
} from "@/lib/admin-ai-llm";
import type {
  WhatsAppDraftFacts,
  WhatsAppDraftResult,
} from "@/lib/whatsapp-draft-types";

export type {
  WhatsAppDraftFacts,
  WhatsAppDraftKind,
  WhatsAppDraftResult,
} from "@/lib/whatsapp-draft-types";

function firstNameSafe(raw: string): string {
  const first = raw.trim().split(/\s+/)[0] || "";
  return first.slice(0, 40) || "tudo bem";
}

function rulesDraft(facts: WhatsAppDraftFacts): WhatsAppDraftResult {
  const name = firstNameSafe(facts.firstName);
  const plan = facts.planName?.trim();
  const days = facts.daysSinceLastActivity;
  const service = facts.lastServiceHint?.trim();
  const shop = facts.shopName?.trim() || "a barbearia";

  let message: string;
  let variants: string[] = [];

  switch (facts.kind) {
    case "winback": {
      const ago =
        days != null && days > 0 ? ` Faz ${days} dias que você não aparece.` : "";
      const svc = service ? ` Seu último ${service} ficou ótimo.` : "";
      message = `Oi ${name}!${ago}${svc} Sentimos sua falta aqui na ${shop}. Quer que eu reserve um horário pra você esta semana?`;
      variants = [
        `E aí ${name}! Passando pra lembrar que temos horários bons esta semana. Bora marcar?`,
        `Oi ${name}, tudo bem? Se quiser encaixar um horário, me fala o melhor dia que eu vejo aqui.`,
      ];
      break;
    }
    case "club_underuse": {
      message = plan
        ? `Oi ${name}! Vi que no plano ${plan} ainda tem visita pra usar. Quer que eu já deixe um horário reservado pra você aproveitar?`
        : `Oi ${name}! Seu plano do clube ainda tem visita pra usar. Quer que eu reserve um horário pra você?`;
      variants = [
        `E aí ${name}! Lembrete amigável: dá pra usar o clube esta semana. Me fala um dia que encaixa.`,
      ];
      break;
    }
    case "club_past_due": {
      message = plan
        ? `Oi ${name}! Passando pra alinhar a assinatura do plano ${plan} — assim você não perde o benefício. Prefere PIX ou cartão pra regularizar?`
        : `Oi ${name}! Passando pra alinhar sua assinatura do clube e manter o benefício. Prefere PIX ou cartão?`;
      variants = [
        `Oi ${name}, tudo bem? Queria ajudar a regularizar o clube pra você continuar cortando sem interrupção. Me chama aqui.`,
      ];
      break;
    }
    case "club_churn": {
      message = plan
        ? `Oi ${name}! Seu plano ${plan} está perto de renovar/pausar. Quer manter, ajustar ou pausar um ciclo? Te ajudo em 1 minuto.`
        : `Oi ${name}! Sua assinatura do clube pede uma decisão rápida (manter, ajustar ou pausar). Posso te ajudar agora?`;
      variants = [
        `E aí ${name}! Antes de qualquer mudança no clube, quer que eu te explique as opções rapidinho?`,
      ];
      break;
    }
    case "club_near_limit": {
      message = plan
        ? `Oi ${name}! No plano ${plan} você já usou quase todas as visitas. Quer encaixar o próximo horário antes de acabar o ciclo?`
        : `Oi ${name}! Seu plano do clube está quase no limite de visitas. Quer que eu reserve o próximo horário?`;
      variants = [
        `E aí ${name}! Ainda dá tempo de usar o clube neste ciclo — me fala um dia bom.`,
      ];
      break;
    }
    default: {
      const _n: never = facts.kind;
      return _n;
    }
  }

  return { message, variants, source: "rules" };
}

async function llmDraft(
  facts: WhatsAppDraftFacts,
): Promise<WhatsAppDraftResult | null> {
  const safe = {
    kind: facts.kind,
    firstName: firstNameSafe(facts.firstName),
    daysSinceLastActivity: facts.daysSinceLastActivity ?? null,
    planName: facts.planName?.trim()?.slice(0, 80) || null,
    lastServiceHint: facts.lastServiceHint?.trim()?.slice(0, 80) || null,
    shopName: facts.shopName?.trim()?.slice(0, 80) || null,
  };

  const system = `Você escreve mensagens curtas de WhatsApp para barbearias no Brasil.
Responda SOMENTE JSON: {"message":"...","variants":["...","..."]}.
Regras: pt-BR, tom humano e direto, 1–3 frases, sem emojis excessivos, sem inventar promoções/preços, sem pedir CPF/telefone, sem jargão de consultoria.`;

  const content = await callAdminAiChat({
    system,
    user: `Gere mensagem de retenção com estes fatos:\n${JSON.stringify(safe)}`,
    temperature: 0.55,
  });
  if (!content) return null;

  const parsed = parseAiJsonObject(content) as {
    message?: unknown;
    variants?: unknown;
  } | null;
  if (!parsed || typeof parsed.message !== "string" || !parsed.message.trim()) {
    return null;
  }
  const variants = Array.isArray(parsed.variants)
    ? parsed.variants
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .map((v) => v.trim())
        .slice(0, 3)
    : [];

  return {
    message: parsed.message.trim(),
    variants,
    source: "llm",
  };
}

export async function generateWhatsAppDraft(
  facts: WhatsAppDraftFacts,
): Promise<WhatsAppDraftResult> {
  if (isAdminAiEnabled()) {
    const llm = await llmDraft(facts);
    if (llm) return llm;
  }
  return rulesDraft(facts);
}

export { isAdminAiEnabled as isWhatsAppDraftAiEnabled };
