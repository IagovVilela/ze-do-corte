import { z } from "zod";

export type ServiceSummary = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
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

export type AppointmentRow = {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  serviceName: string;
  startsAt: string;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED";
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
});
