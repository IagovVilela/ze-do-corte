import "server-only";

import type { Appointment, Service } from "@prisma/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import { Resend } from "resend";

import { BARBER_TIMEZONE } from "@/lib/constants";
import { normalizeWaUserPhone } from "@/lib/booking-domain";
import { prisma } from "@/lib/prisma";
import { sendStaffBookingPush } from "@/lib/push-notify-staff";
import { isWebPushConfigured } from "@/lib/web-push-config";
import { decryptSecret } from "@/lib/whatsapp-crypto";
import { sendWhatsAppText } from "@/lib/whatsapp-meta-client";

export type AppointmentChangeKind = "cancelled" | "rescheduled";
export type AppointmentChangeActor = "salon" | "client";

type ApptWithService = Appointment & {
  service: Pick<Service, "name">;
};

function whenLabel(startsAt: Date): string {
  return formatInTimeZone(
    startsAt,
    BARBER_TIMEZONE,
    "dd/MM/yyyy 'às' HH:mm",
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function resolveOrgWaCreds(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      whatsappBotEnabled: true,
      whatsappPhoneNumberId: true,
      whatsappAccessTokenEnc: true,
      name: true,
    },
  });
  if (
    !org?.whatsappBotEnabled ||
    !org.whatsappPhoneNumberId ||
    !org.whatsappAccessTokenEnc
  ) {
    return null;
  }
  try {
    return {
      phoneNumberId: org.whatsappPhoneNumberId,
      accessToken: decryptSecret(org.whatsappAccessTokenEnc),
      orgName: org.name,
    };
  } catch {
    return null;
  }
}

async function sendClientEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[appointment-change-notify] RESEND_* ausente — e-mail ao cliente não enviado.",
      );
    }
    return;
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    if (error) console.error("[appointment-change-notify] Resend cliente:", error);
  } catch (err) {
    console.error("[appointment-change-notify] e-mail cliente", err);
  }
}

/**
 * Avisa o cliente (WhatsApp + e-mail, quando disponíveis).
 */
export async function notifyClientAppointmentChange(options: {
  organizationId: string;
  appointment: ApptWithService;
  kind: AppointmentChangeKind;
  actor: AppointmentChangeActor;
  previousStartsAt?: Date | null;
}): Promise<void> {
  const { appointment, kind, actor } = options;
  const when = whenLabel(appointment.startsAt);
  const prev =
    options.previousStartsAt != null
      ? whenLabel(options.previousStartsAt)
      : null;
  const shopActor =
    actor === "salon" ? "a barbearia" : "você";
  const otherActor =
    actor === "salon" ? "Nós" : "Você";

  let waText: string;
  let subject: string;
  let emailBody: string;

  if (kind === "cancelled") {
    waText = `Seu agendamento foi cancelado (${shopActor}).\n\n${appointment.service.name}\n${when}`;
    subject = `Agendamento cancelado — ${when}`;
    emailBody = `${otherActor} cancelou o agendamento de ${appointment.service.name} em ${when}.`;
  } else {
    waText = prev
      ? `Seu horário foi remarcado (${shopActor}).\n\n${appointment.service.name}\nDe: ${prev}\nPara: ${when}`
      : `Seu horário foi remarcado (${shopActor}).\n\n${appointment.service.name}\nNovo horário: ${when}`;
    subject = `Agendamento remarcado — ${when}`;
    emailBody = prev
      ? `${otherActor} remarcou ${appointment.service.name}: de ${prev} para ${when}.`
      : `${otherActor} remarcou ${appointment.service.name} para ${when}.`;
  }

  const creds = await resolveOrgWaCreds(options.organizationId);
  if (creds) {
    const to = normalizeWaUserPhone(appointment.clientPhone);
    const result = await sendWhatsAppText({
      phoneNumberId: creds.phoneNumberId,
      accessToken: creds.accessToken,
      toE164Digits: to,
      text: waText,
    });
    await prisma.whatsAppOutboundLog.create({
      data: {
        organizationId: options.organizationId,
        appointmentId: appointment.id,
        waUserPhone: to,
        kind: kind === "cancelled" ? "CANCELLATION" : "MANUAL",
        metaMessageId: result.ok ? result.messageId : null,
        status: result.ok ? "sent" : "error",
        errorMessage: result.ok ? null : result.error,
      },
    });
  }

  const email = appointment.clientEmail?.trim();
  if (email) {
    await sendClientEmail({
      to: email,
      subject,
      text: `Olá ${appointment.clientName},\n\n${emailBody}\n\n— Barbernegon`,
      html: `<p>Olá ${escapeHtml(appointment.clientName)},</p><p>${escapeHtml(emailBody)}</p><p style="color:#666;font-size:12px">Barbernegon — notificação automática</p>`,
    });
  }
}

/**
 * Avisa o profissional (push + e-mail quando possível).
 */
export async function notifyStaffAppointmentChange(options: {
  staffMemberId: string;
  barberEmail: string;
  barberDisplayName: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  serviceName: string;
  startsAt: Date;
  kind: AppointmentChangeKind;
  actor: AppointmentChangeActor;
  previousStartsAt?: Date | null;
}): Promise<void> {
  const whenShort = format(options.startsAt, "dd/MM/yyyy HH:mm");
  const whenLong = format(
    options.startsAt,
    "EEEE, dd 'de' MMMM yyyy 'às' HH:mm",
    { locale: ptBR },
  );
  const greet = options.barberDisplayName?.trim() || "Olá";
  const who =
    options.actor === "client" ? "O cliente" : "Alguém da equipe";
  const title =
    options.kind === "cancelled"
      ? `Cancelado — ${whenShort}`
      : `Remarcado — ${whenShort}`;
  const lead =
    options.kind === "cancelled"
      ? `${who} cancelou um agendamento (${whenLong}).`
      : options.previousStartsAt
        ? `${who} remarcou para ${whenLong} (antes: ${format(options.previousStartsAt, "dd/MM/yyyy HH:mm")}).`
        : `${who} remarcou para ${whenLong}.`;

  if (isWebPushConfigured()) {
    await sendStaffBookingPush(options.staffMemberId, {
      title,
      body: `${options.clientName} · ${options.serviceName}`,
      url: "/admin",
    });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return;

  const lines = [
    `${greet},`,
    "",
    lead,
    "",
    `Cliente: ${options.clientName}`,
    `Telefone: ${options.clientPhone}`,
    options.clientEmail ? `E-mail: ${options.clientEmail}` : null,
    `Serviço: ${options.serviceName}`,
    "",
    "— Barbernegon (notificação automática)",
  ].filter(Boolean) as string[];

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: options.barberEmail,
      subject: title,
      text: lines.join("\n"),
      html: `<p>${escapeHtml(greet)},</p><p>${escapeHtml(lead)}</p><ul><li><strong>Cliente:</strong> ${escapeHtml(options.clientName)}</li><li><strong>Telefone:</strong> ${escapeHtml(options.clientPhone)}</li><li><strong>Serviço:</strong> ${escapeHtml(options.serviceName)}</li></ul>`,
    });
    if (error) console.error("[appointment-change-notify] Resend staff:", error);
  } catch (err) {
    console.error("[appointment-change-notify] e-mail staff", err);
  }
}

/** Carrega profissional do agendamento e dispara aviso, se houver. */
export async function notifyStaffForAppointmentId(
  appointmentId: string,
  kind: AppointmentChangeKind,
  actor: AppointmentChangeActor,
  previousStartsAt?: Date | null,
): Promise<void> {
  const row = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      clientName: true,
      clientPhone: true,
      clientEmail: true,
      startsAt: true,
      staffMemberId: true,
      service: { select: { name: true } },
      staffMember: {
        select: { id: true, email: true, displayName: true },
      },
    },
  });
  if (!row?.staffMember) return;
  await notifyStaffAppointmentChange({
    staffMemberId: row.staffMember.id,
    barberEmail: row.staffMember.email,
    barberDisplayName: row.staffMember.displayName,
    clientName: row.clientName,
    clientPhone: row.clientPhone,
    clientEmail: row.clientEmail,
    serviceName: row.service.name,
    startsAt: row.startsAt,
    kind,
    actor,
    previousStartsAt,
  });
}
