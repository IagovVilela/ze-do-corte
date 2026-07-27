/** ISO weekday: 1 = segunda … 7 = domingo. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type FrequencyCell = {
  weekday: IsoWeekday;
  hour: number;
  count: number;
  /** Ocupação estimada 0–100 (cortes / capacidade do período). */
  percent: number;
};

export type AppointmentFrequencyHeatmap = {
  from: string;
  to: string;
  timezone: string;
  hours: number[];
  weekdays: IsoWeekday[];
  cells: FrequencyCell[];
  /** Capacidade usada no denominador (profissionais × dias daquele weekday). */
  capacityPerWeekdayOccurrence: number;
  totalAppointments: number;
};

export type FrequencyFilters = {
  unitId?: string | null;
  staffMemberId?: string | null;
};

/** Horas exibidas no mapa (09h–19h), alinhado ao legado ASP.NET. */
export const FREQUENCY_HOUR_START = 9;
export const FREQUENCY_HOUR_END = 19;
