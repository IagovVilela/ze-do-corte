export type SaasPlanId = "starter" | "pro";

export type SaasPlanDef = {
  id: SaasPlanId;
  name: string;
  priceMonthly: number;
  tier: "STARTER" | "PRO";
  blurb: string;
  features: string[];
};

export const SAAS_PLANS: SaasPlanDef[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 79,
    tier: "STARTER",
    blurb: "Site white-label, agendamento e admin.",
    features: ["Site /sua-marca", "Agendamento online", "Painel e equipe"],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 129,
    tier: "PRO",
    blurb: "Tudo do Starter + caixa e clube de assinaturas.",
    features: [
      "Relatório de caixa",
      "Clube com cancelamento claro",
      "Prioridade no roadmap",
    ],
  },
];

export function saasPlanById(id: string): SaasPlanDef | null {
  return SAAS_PLANS.find((p) => p.id === id) ?? null;
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
