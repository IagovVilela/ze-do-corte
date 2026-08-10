import type { DashboardRange } from "@/lib/dashboard-period";
import type { AppointmentFrequencyHeatmap } from "@/lib/admin-appointment-frequency-types";
import type {
  DashboardRevenuePoint,
  DashboardServiceBar,
} from "@/lib/types";

export type RightHandMaturity = "insufficient" | "partial" | "full";

export type RightHandCompareMetric = {
  key: "revenue" | "appointments" | "avgTicket" | "cancelRate";
  label: string;
  current: number;
  previous: number;
  deltaPercent: number | null;
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
};

export type RightHandStaffRow = {
  label: string;
  appointments: number;
  completed: number;
  cancelled: number;
  received: number;
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
  }[];
  topServices: { name: string; count: number }[];
  topStaff: { label: string; received: number; completed: number }[];
  retention: {
    atRisk: number;
    lost: number;
    topSpendHint: string | null;
  };
  weakHeatHint: string | null;
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
  revenueSeries: DashboardRevenuePoint[];
  services: DashboardServiceBar[];
  staffRanking: RightHandStaffRow[];
  heatmap: AppointmentFrequencyHeatmap;
  retentionQueue: RightHandRetentionClient[];
  facts: RightHandFacts;
};
