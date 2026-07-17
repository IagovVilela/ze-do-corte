export type SaasPlanId = "starter" | "pro";

export type SaasPlanDef = {
  id: SaasPlanId;
  name: string;
  priceMonthly: number;
  tier: "STARTER" | "PRO";
  /** Frase curta sob o nome */
  blurb: string;
  /** Selo opcional no card (ex.: Mais completo) */
  badge: string | null;
  /** O que o plano inclui (linguagem leiga) */
  features: string[];
  /** O que não inclui (só Starter costuma listar) */
  notIncluded?: string[];
  /** CTA sugerido */
  ctaHint: string;
};

/**
 * Fonte única de verdade para marketing e /admin/plano.
 * Espelha o que o código realmente libera: Pro = Caixa + Clube
 * (trial ativo = acesso Pro completo por 14 dias).
 */
export const SAAS_PLANS: SaasPlanDef[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 79,
    tier: "STARTER",
    blurb: "Sua barbearia online: site, agenda e painel.",
    badge: null,
    features: [
      "Site com a marca da sua barbearia",
      "Clientes agendam sozinhos pelo celular",
      "Painel: agenda, equipe, serviços e unidades",
      "Editor visual do site (arrastar e soltar)",
      "WhatsApp no site (+ assistente, se ligar)",
      "Receber PIX dos clientes (sua conta Asaas)",
      "Aparecer no Explorar (marketplace)",
    ],
    notIncluded: [
      "Caixa e relatório de quanto entrou",
      "Clube de assinaturas dos clientes",
    ],
    ctaHint: "Ideal para começar a operar online.",
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 129,
    tier: "PRO",
    blurb: "Tudo do Starter + dinheiro e fidelização sob controle.",
    badge: "Mais completo",
    features: [
      "Tudo que está no Starter",
      "Caixa: quanto entrou, período e visão clara",
      "Clube: planos mensais com visitas e cancelamento fácil",
      "Cobrança do clube na sua conta Asaas (quando ligada)",
    ],
    ctaHint: "Para quem quer crescer com recorrência e controle financeiro.",
  },
];

/** Texto padrão do trial (não é um plano cobrável). */
export const SAAS_TRIAL_COPY = {
  title: "14 dias grátis com tudo do Pro",
  body: "No trial você testa Caixa, Clube e o restante do produto. Depois escolha Starter ou Pro — o status vira Ativo após o pagamento.",
};

export function saasPlanById(id: string): SaasPlanDef | null {
  return SAAS_PLANS.find((p) => p.id === id) ?? null;
}

export function saasPlanByTier(
  tier: "STARTER" | "PRO" | "TRIAL_FULL" | string,
): SaasPlanDef | null {
  if (tier === "PRO") return saasPlanById("pro");
  if (tier === "STARTER") return saasPlanById("starter");
  return null;
}

export function saasExternalRef(orgId: string, planId: SaasPlanId): string {
  return `saas_org:${orgId}:${planId}`;
}

export function apptExternalRef(appointmentId: string): string {
  return `appt:${appointmentId}`;
}

export function clubExternalRef(subscriptionId: string): string {
  return `club_sub:${subscriptionId}`;
}

export function parseExternalRef(ref: string | null | undefined): {
  kind: "saas" | "appt" | "club";
  id: string;
  planId?: SaasPlanId;
} | null {
  if (!ref) return null;
  const saas = /^saas_org:([^:]+):(starter|pro)$/i.exec(ref);
  if (saas) {
    return {
      kind: "saas",
      id: saas[1]!,
      planId: saas[2]!.toLowerCase() as SaasPlanId,
    };
  }
  const appt = /^appt:(.+)$/i.exec(ref);
  if (appt) return { kind: "appt", id: appt[1]! };
  const club = /^club_sub:(.+)$/i.exec(ref);
  if (club) return { kind: "club", id: club[1]! };
  return null;
}
