import { z } from "zod";

export type ServiceSummary = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
};

/** Barbeiro exibido na home (`getPublicBarbers`). Sem e-mail. */
export type PublicBarber = {
  id: string;
  name: string;
  bio: string | null;
  imageUrl: string | null;
};

export type AvailabilitySlot = {
  hour: string;
  available: boolean;
};

export type DashboardPoint = {
  date: string;
  dateLabel: string;
  count: number;
};

/** Fatia para gráfico de pizza (status no período). */
export type DashboardStatusSlice = {
  name: string;
  value: number;
  color: string;
};

/** Barra horizontal: volume por serviço. */
export type DashboardServiceBar = {
  name: string;
  count: number;
};

/** Linha da tabela-resumo do painel. */
export type DashboardSummaryRow = {
  label: string;
  value: string;
  hint?: string;
};

export type AppointmentRow = {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  serviceName: string;
  startsAt: string;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED";
  unitName?: string | null;
  unitId?: string | null;
  /** Barbeiro atribuído (null = pendente de atribuição). */
  staffMemberId: string | null;
  assignedStaffLabel: string | null;
};

export type ContactInfo = {
  title: string;
  subtitle: string;
};

export const createAppointmentSchema = z.object({
  customerName: z.string().trim().min(3, "Informe seu nome completo."),
  customerPhone: z.string().trim().min(8, "Informe um telefone válido."),
  customerEmail: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
  serviceId: z.string().min(1, "Selecione um serviço."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."),
  notes: z.string().trim().max(240, "Máximo de 240 caracteres.").optional(),
  /** Opcional: barbeiro da unidade padrão; se enviado, dispara e-mail (Resend) para o profissional. */
  staffMemberId: z.string().min(1).optional(),
});
