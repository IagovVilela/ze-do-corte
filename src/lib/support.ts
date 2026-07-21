import type {
  SupportTicketCategory,
  SupportTicketStatus,
} from "@prisma/client";

export const SUPPORT_TICKET_STATUS_LABEL: Record<SupportTicketStatus, string> =
  {
    OPEN: "Aberto",
    IN_PROGRESS: "Em andamento",
    RESOLVED: "Resolvido",
    CLOSED: "Fechado",
  };

export const SUPPORT_TICKET_CATEGORY_LABEL: Record<
  SupportTicketCategory,
  string
> = {
  WHATSAPP: "WhatsApp",
  PAYMENTS: "Pagamentos",
  CLUB: "Clube",
  SITE: "Site",
  BILLING: "Plano Barbernegon",
  OTHER: "Outro",
};

/** Nome exibido no Ops e nas respostas da plataforma nos chamados. */
export const PLATFORM_SUPPORT_DISPLAY_NAME = "Suporte Barbernegon";

/** Contato padrão Barbernegon (sobrescreve com SUPPORT_* no env). */
const DEFAULT_SUPPORT_WHATSAPP_E164 = "5512996373335";
const DEFAULT_SUPPORT_EMAIL = "iagovventura@gmail.com";

export function getSupportContact() {
  const whatsappE164 =
    process.env.SUPPORT_WHATSAPP_E164?.replace(/\D/g, "").trim() ||
    DEFAULT_SUPPORT_WHATSAPP_E164;
  const email =
    process.env.SUPPORT_EMAIL?.trim() || DEFAULT_SUPPORT_EMAIL;
  return {
    whatsappE164,
    whatsappHref: whatsappE164 ? `https://wa.me/${whatsappE164}` : null,
    email,
    mailtoHref: email ? `mailto:${email}` : null,
  };
}
