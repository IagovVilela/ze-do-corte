import "server-only";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Resend } from "resend";

import { prisma } from "@/lib/prisma";
import { sendStaffBookingPush } from "@/lib/push-notify-staff";
import { isWebPushConfigured } from "@/lib/web-push-config";

export type BarberBookingNotifyPayload = {
  staffMemberId: string;
  barberEmail: string;
  barberDisplayName: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  serviceName: string;
  startsAt: Date;
  notes: string | null;
};

/**
 * Avisa o profissional de um novo agendamento atribuído:
 * — Se existir pelo menos uma subscrição Web Push e VAPID estiver configurado → só push (sem e-mail).
 * — Caso contrário → e-mail via Resend (comportamento anterior), se as variáveis Resend existirem.
 */
export async function notifyBarberNewAssignment(
  payload: BarberBookingNotifyPayload,
): Promise<void> {
  const pushCount = await prisma.staffPushSubscription.count({
    where: { staffMemberId: payload.staffMemberId },
  });

  if (pushCount > 0 && isWebPushConfigured()) {
    const whenShort = format(payload.startsAt, "dd/MM/yyyy HH:mm");
    const greet = payload.barberDisplayName?.trim() || "Olá";
    await sendStaffBookingPush(payload.staffMemberId, {
      title: `Novo agendamento — ${whenShort}`,
      body: `${greet}, ${payload.clientName} · ${payload.serviceName}`,
      url: "/admin",
    });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[notify-barber-booking] RESEND_API_KEY ou RESEND_FROM_EMAIL ausente — e-mail não enviado.",
      );
    }
    return;
  }

  const whenLong = format(
    payload.startsAt,
    "EEEE, dd 'de' MMMM yyyy 'às' HH:mm",
    { locale: ptBR },
  );
  const whenShort = format(payload.startsAt, "dd/MM/yyyy HH:mm");
  const greet = payload.barberDisplayName?.trim() || "Olá";

  const lines = [
    `${greet},`,
    "",
    `Novo agendamento com você em ${whenLong}.`,
    "",
    `Cliente: ${payload.clientName}`,
    `Telefone: ${payload.clientPhone}`,
    payload.clientEmail ? `E-mail: ${payload.clientEmail}` : null,
    `Serviço: ${payload.serviceName}`,
    payload.notes?.trim() ? `Observações: ${payload.notes.trim()}` : null,
    "",
    "— Zé do Corte (notificação automática)",
  ].filter(Boolean) as string[];

  const html = `
    <p>${greet},</p>
    <p><strong>Novo agendamento</strong> com você em <strong>${whenLong}</strong>.</p>
    <ul>
      <li><strong>Cliente:</strong> ${escapeHtml(payload.clientName)}</li>
      <li><strong>Telefone:</strong> ${escapeHtml(payload.clientPhone)}</li>
      ${
        payload.clientEmail
          ? `<li><strong>E-mail:</strong> ${escapeHtml(payload.clientEmail)}</li>`
          : ""
      }
      <li><strong>Serviço:</strong> ${escapeHtml(payload.serviceName)}</li>
      ${
        payload.notes?.trim()
          ? `<li><strong>Observações:</strong> ${escapeHtml(payload.notes.trim())}</li>`
          : ""
      }
    </ul>
    <p style="color:#666;font-size:12px">Zé do Corte — notificação automática</p>
  `.trim();

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: payload.barberEmail,
      subject: `Novo agendamento — ${whenShort}`,
      text: lines.join("\n"),
      html,
    });
    if (error) {
      console.error("[notify-barber-booking] Resend:", error);
    }
  } catch (err) {
    console.error("[notify-barber-booking] falha ao enviar", err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
