/**
 * Textos amigáveis para o histórico de avisos Asaas em /admin/pagamentos.
 */

import { parseExternalRef } from "@/lib/asaas-plans";

export type AsaasEventTone = "ok" | "warn" | "error" | "neutral";

type EventCopy = { title: string; hint: string; tone: AsaasEventTone };

const EVENT_COPY: Record<string, EventCopy> = {
  PAYMENT_CREATED: {
    title: "Cobrança gerada",
    hint: "Um PIX ou uma fatura foi criada. O cliente ainda precisa pagar.",
    tone: "neutral",
  },
  PAYMENT_UPDATED: {
    title: "Cobrança atualizada",
    hint: "O Asaas alterou dados dessa cobrança (valor, vencimento ou status).",
    tone: "neutral",
  },
  PAYMENT_CONFIRMED: {
    title: "Pagamento confirmado",
    hint: "O dinheiro foi reconhecido. No PIX do agendamento, o horário passa a constar como pago.",
    tone: "ok",
  },
  PAYMENT_RECEIVED: {
    title: "Pagamento recebido",
    hint: "O valor caiu na sua conta Asaas. Depois você saca para o banco cadastrado.",
    tone: "ok",
  },
  PAYMENT_OVERDUE: {
    title: "Cobrança venceu sem pagamento",
    hint: "O cliente não pagou até o prazo (PIX expirado ou fatura atrasada). No site ele pode gerar um PIX novo, se o horário ainda estiver ativo.",
    tone: "warn",
  },
  PAYMENT_DELETED: {
    title: "Cobrança cancelada",
    hint: "Essa cobrança foi apagada no Asaas e não deve mais ser paga.",
    tone: "neutral",
  },
  PAYMENT_REFUNDED: {
    title: "Pagamento estornado",
    hint: "O valor foi devolvido ao cliente.",
    tone: "warn",
  },
  SUBSCRIPTION_CREATED: {
    title: "Assinatura criada",
    hint: "Uma cobrança recorrente (clube ou plano da plataforma) foi aberta no Asaas.",
    tone: "neutral",
  },
  SUBSCRIPTION_UPDATED: {
    title: "Assinatura atualizada",
    hint: "A recorrência mudou (data, valor ou status).",
    tone: "neutral",
  },
  SUBSCRIPTION_DELETED: {
    title: "Assinatura encerrada",
    hint: "A cobrança recorrente foi cancelada no Asaas.",
    tone: "warn",
  },
};

function normalizeEventCode(event: string): string {
  return event.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function targetLabel(externalReference: string | null | undefined): string | null {
  const parsed = parseExternalRef(externalReference);
  if (!parsed) return null;
  switch (parsed.kind) {
    case "appt":
      return "PIX do agendamento";
    case "club":
      return "assinatura do clube";
    case "saas":
      return parsed.planId === "plus"
        ? "plano Plus da Barbernegon"
        : "plano Pro da Barbernegon";
    default: {
      const _exhaustive: never = parsed.kind;
      return _exhaustive;
    }
  }
}

export function describeAsaasPaymentEvent(
  event: string,
  externalReference?: string | null,
): EventCopy & { context: string | null } {
  const code = normalizeEventCode(event);
  const copy = EVENT_COPY[code] ?? {
    title: "Aviso de pagamento",
    hint: "O Asaas enviou uma atualização desta cobrança.",
    tone: "neutral" as const,
  };
  return { ...copy, context: targetLabel(externalReference) };
}
