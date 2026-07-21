export type SaasPlanId = "pro";

export type SaasPlanDef = {
  id: SaasPlanId;
  name: string;
  priceMonthly: number;
  tier: "PRO";
  blurb: string;
  badge: string | null;
  features: string[];
  notIncluded?: string[];
  ctaHint: string;
};

/** Plano Free forever — só marketing (não cria assinatura Asaas). */
export const SAAS_FREE_PLAN = {
  id: "free" as const,
  name: "Free",
  priceMonthly: 0,
  blurb: "Site, agenda e presença online — para sempre.",
  badge: "Para sempre",
  features: [
    "Site com a marca da sua barbearia",
    "Clientes agendam pelo celular",
    "Painel: agenda, equipe e serviços",
    "Editor visual do site",
    "WhatsApp no site (+ assistente, se ligar)",
    "Receber PIX dos clientes (sua conta Asaas)",
    "Aparecer no Explorar (marketplace)",
    "1 unidade / loja",
  ],
  notIncluded: [
    "Caixa e relatório de quanto entrou",
    "Clube de assinaturas dos clientes",
    "Várias unidades",
  ],
  ctaHint: "Comece grátis e opere de verdade.",
};

/**
 * Único plano cobrável. Pro = Caixa + Clube + multi-unidade.
 * Trial ativo = acesso Pro completo por 60 dias.
 */
export const SAAS_PLANS: SaasPlanDef[] = [
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 129,
    tier: "PRO",
    blurb: "Tudo do Free + dinheiro e fidelização sob controle.",
    badge: "Mais valor",
    features: [
      "Tudo que está no Free",
      "Várias unidades / lojas",
      "Caixa: quanto entrou, período e visão clara",
      "Clube: planos mensais com visitas e cancelamento fácil",
      "Cobrança do clube na sua conta Asaas (quando ligada)",
    ],
    ctaHint: "Para quem quer recorrência e controle financeiro.",
  },
];

/** Texto padrão do trial (Premium grátis no início). */
export const SAAS_TRIAL_DAYS = 60;

export const SAAS_TRIAL_COPY = {
  title: "60 dias com tudo do Pro — grátis",
  body: "No trial você usa Caixa, Clube e multi-unidade. Depois continua no Free para sempre; assine o Pro só se quiser manter esses extras.",
};

export function saasPlanById(id: string): SaasPlanDef | null {
  return SAAS_PLANS.find((p) => p.id === id) ?? null;
}

export function saasPlanByTier(
  tier: "STARTER" | "PRO" | "TRIAL_FULL" | "FREE" | string,
): SaasPlanDef | null {
  if (tier === "PRO") return saasPlanById("pro");
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
    const raw = saas[2]!.toLowerCase();
    // Starter legado no Asaas → trata como Pro (único plano cobrável)
    const planId: SaasPlanId = raw === "pro" ? "pro" : "pro";
    return {
      kind: "saas",
      id: saas[1]!,
      planId,
    };
  }
  const appt = /^appt:(.+)$/i.exec(ref);
  if (appt) return { kind: "appt", id: appt[1]! };
  const club = /^club_sub:(.+)$/i.exec(ref);
  if (club) return { kind: "club", id: club[1]! };
  return null;
}
