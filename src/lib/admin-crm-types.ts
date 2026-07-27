export type AdminCrmClubStatus =
  | "ACTIVE"
  | "PAST_DUE"
  | "PAUSED"
  | "CANCELLED"
  | null;

/** ok &lt; 30d · at_risk 30–59d · lost ≥ 60d sem visita/agenda. */
export type AdminCrmRisk = "ok" | "at_risk" | "lost";

export type AdminCrmClientRow = {
  /** Dígitos nacionais (chave estável). */
  phoneKey: string;
  name: string;
  phone: string;
  email: string | null;
  /** Última visita concluída (ISO), se houver. */
  lastVisitAt: string | null;
  /** Último agendamento não cancelado (ISO). */
  lastBookedAt: string | null;
  visitCount: number;
  bookingCount: number;
  /** Gasto pago registrado; null se o papel não vê receita. */
  totalSpent: number | null;
  clubStatus: AdminCrmClubStatus;
  clubPlanName: string | null;
  whatsappHref: string | null;
  /** wa.me com texto “Sentimos sua falta…”. */
  whatsappWinBackHref: string | null;
  risk: AdminCrmRisk;
  /** Dias desde última visita (ou agenda), null se nunca. */
  daysSinceLastActivity: number | null;
};

export type AdminCrmSnapshot = {
  totalClients: number;
  clubActive: number;
  atRiskCount: number;
  lostCount: number;
  totalSpent: number | null;
  canViewRevenue: boolean;
  page: number;
  pageSize: number;
  totalFiltered: number;
  q: string;
  clubFilter: "all" | "club" | "none";
  riskFilter: "all" | "at_risk" | "lost" | "actionable";
  sort: "lastVisit" | "spent" | "name" | "visits" | "risk";
  /** Top críticos para ligar/WhatsApp hoje (já filtrados). */
  actionQueue: AdminCrmClientRow[];
  clients: AdminCrmClientRow[];
};
