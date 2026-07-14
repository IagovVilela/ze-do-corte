import "server-only";

import type { Appointment, Service } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";

import { decryptSecret } from "@/lib/whatsapp-crypto";
import {
  sendWhatsAppTemplate,
  sendWhatsAppText,
} from "@/lib/whatsapp-meta-client";
import { normalizeWaUserPhone } from "@/lib/booking-domain";
import { prisma } from "@/lib/prisma";
import { BARBER_TIMEZONE } from "@/lib/constants";

type OrgWa = {
  id: string;
  whatsappBotEnabled: boolean;
  whatsappPhoneNumberId: string | null;
  whatsappAccessTokenEnc: string | null;
};

async function resolveOrgCreds(organizationId: string): Promise<{
  phoneNumberId: string;
  accessToken: string;
} | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      whatsappBotEnabled: true,
      whatsappPhoneNumberId: true,
      whatsappAccessTokenEnc: true,
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
    };
  } catch (err) {
    console.error("[whatsapp-notify] decrypt fail", err);
    return null;
  }
}

async function logOutbound(options: {
  organizationId: string;
  appointmentId?: string;
  waUserPhone: string;
  kind: "CONFIRMATION" | "REMINDER" | "CANCELLATION" | "BOT_REPLY";
  result: { ok: true; messageId: string } | { ok: false; error: string };
}) {
  await prisma.whatsAppOutboundLog.create({
    data: {
      organizationId: options.organizationId,
      appointmentId: options.appointmentId,
      waUserPhone: options.waUserPhone,
      kind: options.kind,
      metaMessageId: options.result.ok ? options.result.messageId : null,
      status: options.result.ok ? "sent" : "error",
      errorMessage: options.result.ok ? null : options.result.error,
    },
  });
}

function whenLabel(startsAt: Date): string {
  return formatInTimeZone(
    startsAt,
    BARBER_TIMEZONE,
    "dd/MM/yyyy 'às' HH:mm",
  );
}

export async function notifyClientWhatsAppConfirmation(options: {
  organizationId: string;
  appointment: Appointment & { service: Service };
}): Promise<void> {
  const creds = await resolveOrgCreds(options.organizationId);
  if (!creds) return;

  const to = normalizeWaUserPhone(options.appointment.clientPhone);
  const when = whenLabel(options.appointment.startsAt);
  const templateName =
    process.env.META_WA_TEMPLATE_CONFIRMATION?.trim() || "";

  let result =
    templateName.length > 0
      ? await sendWhatsAppTemplate({
          phoneNumberId: creds.phoneNumberId,
          accessToken: creds.accessToken,
          toE164Digits: to,
          templateName,
          bodyParameters: [
            options.appointment.clientName,
            options.appointment.service.name,
            when,
          ],
        })
      : null;

  if (!result?.ok) {
    result = await sendWhatsAppText({
      phoneNumberId: creds.phoneNumberId,
      accessToken: creds.accessToken,
      toE164Digits: to,
      text: `✅ Agendamento confirmado!\n\n${options.appointment.clientName}, ${options.appointment.service.name}\n${when}\n\nPara remarcar ou cancelar, responda neste chat ou use o link da reserva.`,
    });
  }

  await logOutbound({
    organizationId: options.organizationId,
    appointmentId: options.appointment.id,
    waUserPhone: to,
    kind: "CONFIRMATION",
    result,
  });
}

export async function notifyClientWhatsAppCancellation(options: {
  organizationId: string;
  appointment: Appointment & { service: Pick<Service, "name"> };
}): Promise<void> {
  const creds = await resolveOrgCreds(options.organizationId);
  if (!creds) return;
  const to = normalizeWaUserPhone(options.appointment.clientPhone);
  const when = whenLabel(options.appointment.startsAt);
  const result = await sendWhatsAppText({
    phoneNumberId: creds.phoneNumberId,
    accessToken: creds.accessToken,
    toE164Digits: to,
    text: `Seu agendamento foi cancelado.\n\n${options.appointment.service.name}\n${when}`,
  });
  await logOutbound({
    organizationId: options.organizationId,
    appointmentId: options.appointment.id,
    waUserPhone: to,
    kind: "CANCELLATION",
    result,
  });
}

export async function sendClientWhatsAppReminder(options: {
  organizationId: string;
  appointment: Appointment & { service: Pick<Service, "name"> };
}): Promise<boolean> {
  const creds = await resolveOrgCreds(options.organizationId);
  if (!creds) return false;
  const to = normalizeWaUserPhone(options.appointment.clientPhone);
  const when = whenLabel(options.appointment.startsAt);
  const templateName = process.env.META_WA_TEMPLATE_REMINDER?.trim() || "";

  let result =
    templateName.length > 0
      ? await sendWhatsAppTemplate({
          phoneNumberId: creds.phoneNumberId,
          accessToken: creds.accessToken,
          toE164Digits: to,
          templateName,
          bodyParameters: [
            options.appointment.clientName,
            options.appointment.service.name,
            when,
          ],
        })
      : await sendWhatsAppText({
          phoneNumberId: creds.phoneNumberId,
          accessToken: creds.accessToken,
          toE164Digits: to,
          text: `⏰ Lembrete: você tem horário amanhã?\n\n${options.appointment.service.name}\n${when}\n\nTe esperamos!`,
        });

  await logOutbound({
    organizationId: options.organizationId,
    appointmentId: options.appointment.id,
    waUserPhone: to,
    kind: "REMINDER",
    result,
  });
  return result.ok;
}

export type { OrgWa };
