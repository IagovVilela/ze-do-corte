export type EvolutionMonthPoint = {
  key: string;
  label: string;
  revenue: number;
  noPreference: number;
  clubRevenue: number;
};

export type EvolutionUnitSeries = {
  unitId: string;
  unitName: string;
  months: { key: string; label: string; revenue: number }[];
};

export type EvolutionKpis = {
  clientsYesterday: number;
  clientsWeek: number;
  clientsMonth: number;
  servicesYesterday: number;
  servicesWeek: number;
  servicesMonth: number;
  noPreferenceWeek: number;
  newClientsWeek: number;
  ratingAvg: number | null;
  ratingCount: number;
  topProfessionalName: string | null;
  yearAppointments: number;
};

export type ReturnRateBlock = {
  rate30: number;
  rate60: number;
  bestUnitName: string | null;
  bestStaffName: string | null;
};

export type NoPreferenceRankRow = {
  staffMemberId: string;
  name: string;
  imageUrl: string | null;
  count: number;
};

export type AdminEvolutionSnapshot = {
  from: string;
  to: string;
  months: EvolutionMonthPoint[];
  unitSeries: EvolutionUnitSeries[];
  kpis: EvolutionKpis;
  returnRate: ReturnRateBlock;
  newClientReturn: ReturnRateBlock;
  lostClients: { rate30: number; rate60: number };
  noPreferenceRanking: NoPreferenceRankRow[];
  rankingMonthKey: string;
};
