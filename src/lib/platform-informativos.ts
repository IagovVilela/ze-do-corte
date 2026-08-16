/** Documentos oficiais para o dono do salão (ciência das condições). */

export type PlatformLegalPage = {
  kind: "page";
  id: string;
  title: string;
  summary: string;
  href: string;
};

export type PlatformInformativoPdf = {
  kind: "pdf";
  id: string;
  title: string;
  summary: string;
  href: string;
};

export type PlatformConditionDoc = PlatformLegalPage | PlatformInformativoPdf;

export const PLATFORM_CONDITION_DOCS: PlatformConditionDoc[] = [
  {
    kind: "page",
    id: "termos",
    title: "Termos de Uso",
    summary: "Regras da plataforma, planos, uso aceitável e responsabilidades.",
    href: "/termos",
  },
  {
    kind: "page",
    id: "privacidade",
    title: "Política de Privacidade",
    summary: "Como tratamos dados da barbearia e dos clientes finais (LGPD).",
    href: "/privacidade",
  },
  {
    kind: "pdf",
    id: "pagamentos-asaas",
    title: "Como você recebe o dinheiro dos clientes",
    summary:
      "PIX e clube no Asaas: taxas, saque, cartão e o que a Barbernegon não retém.",
    href: "/informativos/pagamentos-asaas.pdf",
  },
  {
    kind: "pdf",
    id: "whatsapp-plus",
    title: "Como funciona o WhatsApp inteligente (Plus+)",
    summary:
      "Cloud API oficial, o que o cliente vê, reativação com sua aprovação e fatura da Meta.",
    href: "/informativos/whatsapp-plus.pdf",
  },
];
