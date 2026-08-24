/**
 * Textos amigáveis para o histórico de WhatsApp no painel do salão.
 * Sem códigos Meta, variáveis de ambiente ou jargão técnico.
 */

export type WhatsAppLogTone = "ok" | "warn" | "error" | "neutral";

const KIND_LABELS: Record<string, string> = {
  CONFIRMATION: "Confirmação do agendamento",
  REMINDER: "Lembrete do horário",
  CANCELLATION: "Aviso de cancelamento",
  BOT_REPLY: "Resposta do assistente",
  WINBACK: "Mensagem de reativação",
  OPT_OUT_ACK: "Confirmação de descadastro",
  MANUAL: "Mensagem manual",
};

const STATUS_LABELS: Record<
  string,
  { label: string; tone: WhatsAppLogTone; hint?: string }
> = {
  sent: {
    label: "Enviada",
    tone: "ok",
    hint: "O envio foi aceito. Se o cliente não recebeu, peça para ele mandar um “oi” no WhatsApp da barbearia e tente de novo — ou fale com o suporte para liberar avisos automáticos.",
  },
  delivered: {
    label: "Entregue no celular",
    tone: "ok",
  },
  read: {
    label: "Lida pelo cliente",
    tone: "ok",
  },
  pending: {
    label: "Aguardando",
    tone: "warn",
  },
  error: {
    label: "Não chegou",
    tone: "error",
  },
  failed: {
    label: "Não chegou",
    tone: "error",
  },
};

type FriendlyError = { title: string; howToFix: string };

function matchFriendlyError(raw: string): FriendlyError | null {
  const t = raw.toLowerCase();

  if (
    t.includes("131047") ||
    t.includes("re-engagement") ||
    t.includes("more than 24 hours")
  ) {
    return {
      title: "O cliente precisa falar no WhatsApp antes",
      howToFix:
        "Peça para ele enviar um “oi” para o número da barbearia e tente de novo. Se quiser avisar sem isso, fale com o suporte para liberar os avisos automáticos.",
    };
  }

  if (
    t.includes("131030") ||
    t.includes("allowed list") ||
    t.includes("not in allowed")
  ) {
    return {
      title: "Este número ainda não está liberado para teste",
      howToFix:
        "No período de testes, só alguns celulares recebem mensagem. Peça ao suporte para liberar o número do cliente.",
    };
  }

  if (
    t.includes("authentication") ||
    t.includes("oauth") ||
    t.includes("access token") ||
    t.includes("(#190)") ||
    t.includes("session has expired")
  ) {
    return {
      title: "A conexão com o WhatsApp expirou",
      howToFix:
        "Abra WhatsApp no painel, atualize a chave de acesso e salve. Se não souber como, chame o suporte.",
    };
  }

  if (t.includes("131026") || t.includes("undeliverable")) {
    return {
      title: "Não foi possível entregar neste número",
      howToFix:
        "Confira se o telefone está certo (com DDD) e se a pessoa tem WhatsApp ativo.",
    };
  }

  if (t.includes("131048") || t.includes("spam rate")) {
    return {
      title: "Muitos envios em pouco tempo",
      howToFix:
        "Espere um pouco e evite disparar mensagem em massa. Prefira avisar só quem realmente agendou.",
    };
  }

  if (t.includes("130429") || t.includes("rate limit") || t.includes("too many")) {
    return {
      title: "Muitas mensagens em pouco tempo",
      howToFix: "Aguarde alguns minutos e tente novamente.",
    };
  }

  if (t.includes("132001") || t.includes("template name does not exist")) {
    return {
      title: "O aviso automático ainda não está configurado",
      howToFix:
        "Fale com o suporte para liberar os avisos de confirmação e lembrete da barbearia.",
    };
  }

  if (t.includes("132000") || t.includes("parameter count")) {
    return {
      title: "O aviso automático está incompleto",
      howToFix:
        "Fale com o suporte — o texto do aviso precisa ser ajustado.",
    };
  }

  if (t.includes("131031") || t.includes("business eligibility")) {
    return {
      title: "A conta WhatsApp ainda não pode enviar este tipo de mensagem",
      howToFix:
        "A conta pode estar em análise ou com restrição. Fale com o suporte para verificar.",
    };
  }

  return null;
}

export function whatsappLogKindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? "Mensagem WhatsApp";
}

export function whatsappLogStatusInfo(status: string): {
  label: string;
  tone: WhatsAppLogTone;
  hint?: string;
} {
  return (
    STATUS_LABELS[status] ?? {
      label: "Status desconhecido",
      tone: "neutral",
    }
  );
}

/** Explicação curta do erro, para leigo. */
export function whatsappLogErrorFriendly(errorMessage: string | null): {
  title: string;
  howToFix?: string;
} | null {
  if (!errorMessage?.trim()) return null;
  const mapped = matchFriendlyError(errorMessage);
  if (mapped) return mapped;
  return {
    title: "O WhatsApp recusou o envio",
    howToFix:
      "Tente de novo em alguns minutos. Se repetir, confira o número do cliente, se o assistente está ligado, ou fale com o suporte.",
  };
}

export function formatWhatsAppLogPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    if (rest.length === 9) {
      return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    }
    if (rest.length === 8) {
      return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    }
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return phone.startsWith("+") ? phone : `+${digits || phone}`;
}
