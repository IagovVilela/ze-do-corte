import type { DashboardRange } from "@/lib/dashboard-period";
import type { AppointmentFrequencyHeatmap } from "@/lib/admin-appointment-frequency-types";
import type {
  DashboardRevenuePoint,
  DashboardServiceBar,
} from "@/lib/types";
import type { CohortBucket } from "@/lib/right-hand-metrics";

export type RightHandMaturity = "insufficient" | "partial" | "full";

export type RightHandCompareMetric = {
  key: "revenue" | "appointments" | "avgTicket" | "cancelRate";
  label: string;
  current: number;
  previous: number;
  /** Variação relativa (%) ou, para cancelRate, pontos percentuais. */
  deltaPercent: number | null;
  /** Como interpretar deltaPercent na UI. */
  deltaMode: "percent" | "points";
  format: "money" | "number" | "percent";
};

export type RightHandRetentionClient = {
  phoneKey: string;
  name: string;
  phone: string;
  risk: "at_risk" | "lost";
  daysSinceLastActivity: number | null;
  lastServiceName: string | null;
  totalSpent: number | null;
  clubPlanName: string | null;
  /** Alerta preditivo: intervalo usual sugere risco antes dos 45d. */
  earlyChurnHint?: string | null;
};

export type RightHandStaffRow = {
  label: string;
  appointments: number;
  completed: number;
  cancelled: number;
  received: number;
};

export type RightHandFunnel = {
  scheduled: number;
  confirmed: number;
  completed: number;
  paid: number;
};

export type RightHandPromoSuggestion = {
  title: string;
  detail: string;
  copyText: string;
  href: string;
};

export type RightHandPrediction = {
  weakWeekdayLabel: string;
  weakAvg: number;
  detail: string;
};

export type RightHandFacts = {
  generatedAt: string;
  organizationId: string;
  range: string;
  periodLabel: string;
  maturity: RightHandMaturity;
  historyDays: number;
  empty: boolean;
  kpis: {
    revenue: number;
    appointments: number;
    paidCount: number;
    completedUnpaid: number;
    appointmentsHint: string;
    avgTicket: number;
    cancelRate: number;
    completionRate: number;
    newClients: number;
    recurringClients: number;
    atRiskClients: number;
    lostClients: number;
    estimatedLtv: number | null;
  };
  compare: {
    key: string;
    label: string;
    current: number;
    previous: number;
    deltaPercent: number | null;
    deltaMode: "percent" | "points";
  }[];
  funnel: RightHandFunnel;
  cohorts: CohortBucket[];
  topServices: { name: string; count: number }[];
  topStaff: { label: string; received: number; completed: number }[];
  retention: {
    atRisk: number;
    lost: number;
    topSpendHint: string | null;
  };
  weakHeatHint: string | null;
  prediction: RightHandPrediction | null;
  promoSuggestion: RightHandPromoSuggestion | null;
};

export type RightHandSnapshot = {
  generatedAt: string;
  organizationId: string;
  range: DashboardRange;
  periodLabel: string;
  previousPeriodLabel: string;
  maturity: RightHandMaturity;
  maturityMessage: string | null;
  historyDays: number;
  empty: boolean;
  publicBookingPath: string | null;
  kpis: RightHandFacts["kpis"];
  compare: RightHandCompareMetric[];
  funnel: RightHandFunnel;
  cohorts: CohortBucket[];
  revenueSeries: DashboardRevenuePoint[];
  peakValley: { peakIndex: number | null; valleyIndex: number | null };
  services: DashboardServiceBar[];
  staffRanking: RightHandStaffRow[];
  heatmap: AppointmentFrequencyHeatmap;
  retentionQueue: RightHandRetentionClient[];
  prediction: RightHandPrediction | null;
  promoSuggestion: RightHandPromoSuggestion | null;
  facts: RightHandFacts;
};
