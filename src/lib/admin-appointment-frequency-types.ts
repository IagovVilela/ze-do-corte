import type { DashboardRange } from "@/lib/dashboard-period";
import type { ConfidenceLevel } from "@/lib/right-hand-confidence";

/** ISO weekday: 1 = segunda … 7 = domingo. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type FrequencyScaleMode = "occupancy" | "relative";

export type FrequencyCell = {
  weekday: IsoWeekday;
  hour: number;
  count: number;
  /**
   * 0–100.
   * `occupancy`: cortes / (ocorrências do weekday × capacidade).
   * `relative`: intensidade vs célula mais quente (amostra pequena).
   */
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
  /** occupancy com volume ≥ limiar; relative quando amostra fraca. */
  scaleMode: FrequencyScaleMode;
  /** Rótulo do período (ex.: Últimos 90 dias). */
  periodLabel: string;
  confidence: ConfidenceLevel;
};

export type FrequencyFilters = {
  unitId?: string | null;
  staffMemberId?: string | null;
  /** Janela explícita (UTC/instantes). Sem isso: últimos 30 dias. */
  from?: Date;
  to?: Date;
  /** Datas civis AAAA-MM-DD no fuso da org. Têm prioridade sobre `from`/`to`. */
  fromYmd?: string;
  toYmd?: string;
  /** Só para rótulo / API; a janela vem de `from`/`to`, `fromYmd`/`toYmd` ou padrão 30d. */
  chartRange?: DashboardRange;
  periodLabel?: string;
};

/** Horas exibidas no mapa (09h–19h), alinhado ao legado ASP.NET. */
export const FREQUENCY_HOUR_START = 9;
export const FREQUENCY_HOUR_END = 19;
