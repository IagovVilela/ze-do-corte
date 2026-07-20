import "server-only";

import { formatInTimeZone } from "date-fns-tz";
import { Resend } from "resend";

import { BARBER_TIMEZONE } from "@/lib/constants";
import { normalizeWaUserPhone } from "@/lib/booking-domain";
import { decryptSecret } from "@/lib/whatsapp-crypto";
import { sendWhatsAppText } from "@/lib/whatsapp-meta-client";
import { prisma } from "@/lib/prisma";

export type ClubNotifyEvent =
  | "past_due"
  | "cancelled"
  | "paused"
  | "resumed"
  | "postponed";

function buildClubMessage(options: {
  clientName: string;
  planName: string;
  shopName: string;
  event: ClubNotifyEvent;
  reason?: string | null;
  untilLabel?: string | null;
}): string {
  const name = options.clientName.trim() || "Cliente";
  const plan = options.planName.trim() || "clube";
  const shop = options.shopName.trim() || "sua barbearia";

  switch (options.event) {
    case "past_due":
      return `Olá, ${name}!\n\nSua assinatura do *${plan}* em ${shop} está com pagamento em atraso. Enquanto isso, o benefício do clube fica pausado.\n\nRegularize o pagamento para voltar a usar. Qualquer dúvida, fale com o salão.`;
    case "cancelled":
      return `Olá, ${name}!\n\nSua assinatura do *${plan}* em ${shop} foi cancelada.${
        options.reason ? `\nMotivo: ${options.reason}` : ""
      }\n\nSe quiser voltar, fale com o salão.`;
    case "paused":
      return `Olá, ${name}!\n\nSua assinatura do *${plan}* em ${shop} foi *pausada*. O acesso ao clube fica bloqueado até a reativação.${
        options.reason ? `\nMotivo: ${options.reason}` : ""
      }`;
    case "resumed":
      return `Olá, ${name}!\n\nSua assinatura do *${plan}* em ${shop} foi *reativada*. Você já pode usar o benefício do clube de novo.`;
    case "postponed":
      return `Olá, ${name}!\n\nSua assinatura do *${plan}* em ${shop} foi *adiada*.${
        options.untilLabel
          ? `\nNovo prazo / vencimento: ${options.untilLabel}.`
          : ""
      }\n\nO salão avisará se precisar de algo mais.`;
    default: {
      const _exhaustive: never = options.event;
      return _exhaustive;
    }
  }
}

function subjectFor(event: ClubNotifyEvent, planName: string): string {
  switch (event) {
    case "past_due":
      return `Pagamento em atraso — ${planName}`;
    case "cancelled":
      return `Assinatura cancelada — ${planName}`;
    case "paused":
      return `Assinatura pausada — ${planName}`;
    case "resumed":
      return `Assinatura reativada — ${planName}`;
    case "postponed":
      return `Assinatura adiada — ${planName}`;
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

async function sendClubWhatsApp(options: {
  organizationId: string;
  clientPhone: string;
  text: string;
}): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: options.organizationId },
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
    return;
  }

  let accessToken: string;
  try {
    accessToken = decryptSecret(org.whatsappAccessTokenEnc);
  } catch (err) {
    console.error("[club-notify] decrypt fail", err);
    return;
  }

  const to = normalizeWaUserPhone(options.clientPhone);
  const result = await sendWhatsAppText({
    phoneNumberId: org.whatsappPhoneNumberId,
    accessToken,
    toE164Digits: to,
    text: options.text,
  });

  await prisma.whatsAppOutboundLog.create({
    data: {
      organizationId: options.organizationId,
      waUserPhone: to,
      kind: "MANUAL",
      metaMessageId: result.ok ? result.messageId : null,
      status: result.ok ? "sent" : "error",
      errorMessage: result.ok ? null : result.error,
    },
  });
}

async function sendClubEmail(options: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from || !options.to.trim()) return;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: options.to.trim(),
      subject: options.subject,
      text: options.text,
    });
    if (error) console.error("[club-notify] Resend:", error);
  } catch (err) {
    console.error("[club-notify] Resend exception", err);
  }
}

/** Avisa o cliente do clube (WhatsApp se bot ativo; e-mail se Resend + e-mail cadastrado). */
export async function notifyClubClient(options: {
  organizationId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  planName: string;
  event: ClubNotifyEvent;
  reason?: string | null;
  until?: Date | null;
}): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: options.organizationId },
    select: { name: true },
  });
  const untilLabel = options.until
    ? formatInTimeZone(options.until, BARBER_TIMEZONE, "dd/MM/yyyy")
    : null;
  const text = buildClubMessage({
    clientName: options.clientName,
    planName: options.planName,
    shopName: org?.name ?? "sua barbearia",
    event: options.event,
    reason: options.reason,
    untilLabel,
  });

  await Promise.all([
    sendClubWhatsApp({
      organizationId: options.organizationId,
      clientPhone: options.clientPhone,
      text,
    }),
    options.clientEmail
      ? sendClubEmail({
          to: options.clientEmail,
          subject: subjectFor(options.event, options.planName),
          text,
        })
      : Promise.resolve(),
  ]);
}
