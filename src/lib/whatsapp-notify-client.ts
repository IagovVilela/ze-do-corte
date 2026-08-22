import "server-only";

import type { Appointment, Service } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";

import { normalizeWaUserPhone } from "@/lib/booking-domain";
import { BARBER_TIMEZONE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getPublicAppBaseUrl } from "@/lib/public-app-url";
import { decryptSecret } from "@/lib/whatsapp-crypto";
import {
  sendWhatsAppTemplate,
  sendWhatsAppText,
} from "@/lib/whatsapp-meta-client";

async function resolveOrgCreds(organizationId: string): Promise<{
  phoneNumberId: string;
  accessToken: string;
  confirmBooking: boolean;
  reminder24h: boolean;
  orgName: string;
} | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      whatsappBotEnabled: true,
      whatsappConfirmBooking: true,
      whatsappReminder24h: true,
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
      confirmBooking: org.whatsappConfirmBooking,
      reminder24h: org.whatsappReminder24h,
      orgName: org.name,
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
  kind:
    | "CONFIRMATION"
    | "REMINDER"
    | "CANCELLATION"
    | "BOT_REPLY"
    | "WINBACK"
    | "OPT_OUT_ACK";
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

function moneyBr(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function manageUrlForToken(token: string | null | undefined): string | null {
  if (!token?.trim()) return null;
  const base = getPublicAppBaseUrl();
  if (!base) return null;
  return `${base}/minha-reserva/${encodeURIComponent(token.trim())}`;
}

type ComandaLine = { name: string; price: number; durationMinutes: number };

async function loadComandaDetails(appointmentId: string): Promise<{
  clientName: string;
  clientPhone: string;
  startsAt: Date;
  endsAt: Date;
  clientManageToken: string | null;
  unitName: string | null;
  staffName: string | null;
  lines: ComandaLine[];
  usedClub: boolean;
} | null> {
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      clientName: true,
      clientPhone: true,
      startsAt: true,
      endsAt: true,
      clientManageToken: true,
      usedSubscriptionId: true,
      unit: { select: { name: true } },
      staffMember: { select: { displayName: true, email: true } },
      service: {
        select: { name: true, price: true, durationMinutes: true },
      },
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          price: true,
          durationMinutes: true,
          service: { select: { name: true } },
        },
      },
    },
  });
  if (!appt) return null;

  const lines: ComandaLine[] =
    appt.items.length > 0
      ? appt.items.map((item) => ({
          name: item.service.name,
          price: Number(item.price),
          durationMinutes: item.durationMinutes,
        }))
      : [
          {
            name: appt.service.name,
            price: Number(appt.service.price),
            durationMinutes: appt.service.durationMinutes,
          },
        ];

  return {
    clientName: appt.clientName,
    clientPhone: appt.clientPhone,
    startsAt: appt.startsAt,
    endsAt: appt.endsAt,
    clientManageToken: appt.clientManageToken,
    unitName: appt.unit?.name ?? null,
    staffName:
      appt.staffMember?.displayName?.trim() ||
      appt.staffMember?.email ||
      null,
    lines,
    usedClub: Boolean(appt.usedSubscriptionId),
  };
}

/** Texto da comanda + link de gestão para o cliente. */
export function buildClientBookingComandaText(input: {
  orgName: string;
  clientName: string;
  when: string;
  endsLabel: string;
  unitName: string | null;
  staffName: string | null;
  lines: ComandaLine[];
  usedClub: boolean;
  manageUrl: string | null;
}): string {
  const serviceBlock = input.lines
    .map((line) => {
      const price = input.usedClub
        ? "crédito do clube"
        : moneyBr(line.price);
      return `• ${line.name} (${line.durationMinutes} min) — ${price}`;
    })
    .join("\n");

  const totalMinutes = input.lines.reduce(
    (sum, line) => sum + line.durationMinutes,
    0,
  );
  const totalPrice = input.lines.reduce((sum, line) => sum + line.price, 0);
  const totalLine = input.usedClub
    ? `Total: crédito do clube · ${totalMinutes} min`
    : `Total: ${moneyBr(totalPrice)} · ${totalMinutes} min`;

  const parts = [
    `✅ *Agendamento confirmado — ${input.orgName}*`,
    "",
    `Olá, ${input.clientName}! Segue a comanda do seu horário:`,
    "",
    `📅 ${input.when}`,
    `⏱ Termina às ${input.endsLabel}`,
  ];

  if (input.unitName) parts.push(`📍 ${input.unitName}`);
  if (input.staffName) parts.push(`✂️ ${input.staffName}`);

  parts.push("", "*Serviços*", serviceBlock, "", totalLine);

  if (input.manageUrl) {
    parts.push(
      "",
      "🔗 *Sua comanda / gerenciar reserva*",
      "Abra o link para ver detalhes, remarcar ou cancelar:",
      input.manageUrl,
    );
  } else {
    parts.push("", "Para remarcar ou cancelar, responda neste chat.");
  }

  return parts.join("\n");
}

/**
 * Envia a comanda do agendamento no WhatsApp (detalhes + link /minha-reserva).
 * Site, bot e agente Plus+ devem chamar após criar a reserva.
 */
export async function notifyClientWhatsAppConfirmation(options: {
  organizationId: string;
  appointment: Appointment & { service: Service };
}): Promise<void> {
  const creds = await resolveOrgCreds(options.organizationId);
  if (!creds || !creds.confirmBooking) return;

  const details = await loadComandaDetails(options.appointment.id);
  const to = normalizeWaUserPhone(
    details?.clientPhone ?? options.appointment.clientPhone,
  );
  const when = whenLabel(details?.startsAt ?? options.appointment.startsAt);
  const endsLabel = formatInTimeZone(
    details?.endsAt ?? options.appointment.endsAt,
    BARBER_TIMEZONE,
    "HH:mm",
  );
  const manageUrl = manageUrlForToken(
    details?.clientManageToken ?? options.appointment.clientManageToken,
  );
  const lines =
    details?.lines ??
    [
      {
        name: options.appointment.service.name,
        price: Number(options.appointment.service.price),
        durationMinutes: options.appointment.service.durationMinutes,
      },
    ];
  const serviceSummary = lines.map((l) => l.name).join(" + ");
  const comandaText = buildClientBookingComandaText({
    orgName: creds.orgName,
    clientName: details?.clientName ?? options.appointment.clientName,
    when,
    endsLabel,
    unitName: details?.unitName ?? null,
    staffName: details?.staffName ?? null,
    lines,
    usedClub: details?.usedClub ?? false,
    manageUrl,
  });

  const templateName =
    process.env.META_WA_TEMPLATE_CONFIRMATION?.trim() || "";

  // Preferir comanda completa em texto (janela 24h). Template só se o texto falhar.
  let result = await sendWhatsAppText({
    phoneNumberId: creds.phoneNumberId,
    accessToken: creds.accessToken,
    toE164Digits: to,
    text: comandaText,
    previewUrl: Boolean(manageUrl),
  });

  if (!result.ok && templateName.length > 0) {
    result = await sendWhatsAppTemplate({
      phoneNumberId: creds.phoneNumberId,
      accessToken: creds.accessToken,
      toE164Digits: to,
      templateName,
      bodyParameters: [
        details?.clientName ?? options.appointment.clientName,
        serviceSummary,
        when,
        ...(manageUrl ? [manageUrl] : []),
      ],
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
  /** day = ~24h antes; near = ~2h antes */
  variant?: "day" | "near";
}): Promise<boolean> {
  const creds = await resolveOrgCreds(options.organizationId);
  if (!creds || !creds.reminder24h) return false;
  const variant = options.variant ?? "day";
  const to = normalizeWaUserPhone(options.appointment.clientPhone);
  const when = whenLabel(options.appointment.startsAt);
  const details = await loadComandaDetails(options.appointment.id);
  const manageUrl = manageUrlForToken(details?.clientManageToken);
  const templateName =
    (variant === "near"
      ? process.env.META_WA_TEMPLATE_REMINDER_NEAR?.trim()
      : null) ||
    process.env.META_WA_TEMPLATE_REMINDER?.trim() ||
    "";

  const headline =
    variant === "near"
      ? "Seu horário está próximo"
      : "Você tem horário amanhã";
  const emoji = variant === "near" ? "⏱" : "⏰";
  const reminderText = [
    `${emoji} *${headline} — ${creds.orgName}*`,
    "",
    `Olá, ${options.appointment.clientName}!`,
    variant === "near"
      ? "Falta pouco para o seu atendimento:"
      : "Lembrete do seu horário:",
    `*${options.appointment.service.name}*`,
    when,
    manageUrl
      ? `\nGerenciar / ver comanda:\n${manageUrl}`
      : "\nTe esperamos!",
  ].join("\n");

  // Preferir texto na janela 24h; template se o texto falhar (fora da janela).
  let result = await sendWhatsAppText({
    phoneNumberId: creds.phoneNumberId,
    accessToken: creds.accessToken,
    toE164Digits: to,
    previewUrl: Boolean(manageUrl),
    text: reminderText,
  });

  if (!result.ok && templateName.length > 0) {
    result = await sendWhatsAppTemplate({
      phoneNumberId: creds.phoneNumberId,
      accessToken: creds.accessToken,
      toE164Digits: to,
      templateName,
      bodyParameters: [
        options.appointment.clientName,
        options.appointment.service.name,
        when,
        ...(manageUrl ? [manageUrl] : []),
      ],
    });
  }

  await logOutbound({
    organizationId: options.organizationId,
    appointmentId: options.appointment.id,
    waUserPhone: to,
    kind: "REMINDER",
    result,
  });
  return result.ok;
}
