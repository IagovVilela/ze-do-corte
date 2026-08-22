/**
 * Textos amigáveis para o histórico de WhatsApp no painel do salão.
 * Esconde códigos da Meta e jargão técnico.
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
    label: "Aceita pela Meta",
    tone: "ok",
    hint: "Isso não garante que chegou no celular. Se o cliente não recebeu, peça para mandar um “oi” no WhatsApp da barbearia (janela de 24h) ou use um modelo aprovado na Meta.",
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
      title: "O cliente está fora da janela de 24 horas do WhatsApp",
      howToFix:
        "Peça para ele enviar uma mensagem (ex.: “oi”) para o número da barbearia e tente de novo. Ou use um modelo de mensagem aprovado na Meta.",
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
        "No painel da Meta (WhatsApp → API), adicione o celular do cliente na lista de números de teste. Com número oficial já verificado, isso deixa de ser necessário.",
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
      title: "A conexão com o WhatsApp expirou ou está inválida",
      howToFix:
        "Abra WhatsApp no painel, cole um token novo da Meta e salve. Depois teste de novo.",
    };
  }

  if (t.includes("131026") || t.includes("undeliverable")) {
    return {
      title: "Não foi possível entregar neste número",
      howToFix:
        "Confira se o telefone está certo (DDI 55 + DDD + número) e se a pessoa tem WhatsApp ativo.",
    };
  }

  if (t.includes("131048") || t.includes("spam rate")) {
    return {
      title: "A Meta limitou envios por suspeita de spam",
      howToFix:
        "Espere um pouco e evite disparos em massa. Prefira mensagens só para quem realmente agendou.",
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
      title: "O modelo de mensagem não foi encontrado",
      howToFix:
        "Confira o nome do template aprovado na Meta e se ele está configurado no servidor.",
    };
  }

  if (t.includes("132000") || t.includes("parameter count")) {
    return {
      title: "O modelo de mensagem está com campos errados",
      howToFix:
        "O texto aprovado na Meta precisa ter a mesma quantidade de variáveis que o sistema envia.",
    };
  }

  if (t.includes("131031") || t.includes("business eligibility")) {
    return {
      title: "A conta WhatsApp Business ainda não pode enviar este tipo de mensagem",
      howToFix:
        "Verifique no Gerenciador da Meta se a conta está aprovada e sem restrições.",
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
      label: status || "Desconhecido",
      tone: "neutral",
    }
  );
}

/** Explicação curta do erro Meta, para leigo. */
export function whatsappLogErrorFriendly(errorMessage: string | null): {
  title: string;
  howToFix?: string;
} | null {
  if (!errorMessage?.trim()) return null;
  const mapped = matchFriendlyError(errorMessage);
  if (mapped) return mapped;
  return {
    title: "A Meta recusou o envio",
    howToFix:
      "Tente de novo em alguns minutos. Se repetir, confira o token, o número do cliente e se o assistente está ligado.",
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
