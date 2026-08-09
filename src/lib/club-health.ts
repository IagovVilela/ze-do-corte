/**
 * Saúde do clube a partir das assinaturas (buckets estilo Cash Barber).
 */

export type ClubHealthSub = {
  id: string;
  clientName: string;
  clientPhone: string;
  status: string;
  currentPeriodEnd: string | Date;
  visitsUsed: number;
  plan: { name: string; visitsIncluded: number | null };
};

export type ClubHealthBucketKey =
  | "underuse"
  | "nearLimit"
  | "pastDue"
  | "churnRisk";

export type ClubHealthBucket = {
  key: ClubHealthBucketKey;
  label: string;
  description: string;
  count: number;
  items: {
    id: string;
    clientName: string;
    clientPhone: string;
    detail: string;
    planName: string;
  }[];
};

const LIST_LIMIT = 8;

function periodEndMs(value: string | Date): number {
  const d = value instanceof Date ? value : new Date(value);
  return d.getTime();
}

/**
 * Calcula buckets de saúde. Uma assinatura pode aparecer em mais de um bucket
 * (ex.: PAST_DUE e no limite de visitas).
 */
export function buildClubHealthBuckets(
  subs: ClubHealthSub[],
  now: Date = new Date(),
): ClubHealthBucket[] {
  const in7d = now.getTime() + 7 * 24 * 60 * 60 * 1000;

  const underuse: ClubHealthBucket["items"] = [];
  const nearLimit: ClubHealthBucket["items"] = [];
  const pastDue: ClubHealthBucket["items"] = [];
  const churnRisk: ClubHealthBucket["items"] = [];

  for (const s of subs) {
    const included = s.plan.visitsIncluded;
    if (
      included != null &&
      included > 0 &&
      (s.status === "ACTIVE" || s.status === "PAST_DUE" || s.status === "PAUSED")
    ) {
      const ratio = s.visitsUsed / included;
      if (ratio < 0.4) {
        underuse.push({
          id: s.id,
          clientName: s.clientName,
          clientPhone: s.clientPhone,
          planName: s.plan.name,
          detail: `${s.visitsUsed}/${included} visitas · ${s.plan.name}`,
        });
      }
      if (ratio >= 0.9) {
        nearLimit.push({
          id: s.id,
          clientName: s.clientName,
          clientPhone: s.clientPhone,
          planName: s.plan.name,
          detail: `${s.visitsUsed}/${included} visitas · ${s.plan.name}`,
        });
      }
    }

    if (s.status === "PAST_DUE") {
      pastDue.push({
        id: s.id,
        clientName: s.clientName,
        clientPhone: s.clientPhone,
        planName: s.plan.name,
        detail: s.plan.name,
      });
    }

    const end = periodEndMs(s.currentPeriodEnd);
    const endingSoon =
      Number.isFinite(end) && end >= now.getTime() && end <= in7d;
    if (s.status === "PAUSED" || (endingSoon && s.status !== "CANCELLED")) {
      const reason =
        s.status === "PAUSED"
          ? "Pausada"
          : `Vence ${new Date(end).toLocaleDateString("pt-BR")}`;
      churnRisk.push({
        id: s.id,
        clientName: s.clientName,
        clientPhone: s.clientPhone,
        planName: s.plan.name,
        detail: `${reason} · ${s.plan.name}`,
      });
    }
  }

  return [
    {
      key: "underuse",
      label: "Subuso",
      description: "Usou menos de 40% das visitas do ciclo",
      count: underuse.length,
      items: underuse.slice(0, LIST_LIMIT),
    },
    {
      key: "nearLimit",
      label: "No limite",
      description: "Usou 90% ou mais das visitas inclusas",
      count: nearLimit.length,
      items: nearLimit.slice(0, LIST_LIMIT),
    },
    {
      key: "pastDue",
      label: "Inadimplente",
      description: "Assinatura em atraso (PAST_DUE)",
      count: pastDue.length,
      items: pastDue.slice(0, LIST_LIMIT),
    },
    {
      key: "churnRisk",
      label: "Risco de churn",
      description: "Pausada ou período encerrando em até 7 dias",
      count: churnRisk.length,
      items: churnRisk.slice(0, LIST_LIMIT),
    },
  ];
}

/**
 * Sugere preço de plano: ticket × visitas × (1 − margem%/100).
 * Margem = desconto em relação ao avulso no mês.
 */
export function suggestClubPlanPrice(options: {
  averageTicket: number;
  visitsPerMonth: number;
  marginPercent: number;
}): number {
  const ticket = Math.max(0, options.averageTicket);
  const visits = Math.max(0, options.visitsPerMonth);
  const margin = Math.min(100, Math.max(0, options.marginPercent));
  const raw = ticket * visits * (1 - margin / 100);
  return Math.round(raw * 100) / 100;
}
