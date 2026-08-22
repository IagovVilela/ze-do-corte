import "server-only";

import { addHours, addMinutes } from "date-fns";

import { prisma } from "@/lib/prisma";
import { sendClientWhatsAppReminder } from "@/lib/whatsapp-notify-client";

const ORG_WA_FILTER = {
  whatsappBotEnabled: true,
  whatsappReminder24h: true,
  whatsappPhoneNumberId: { not: null },
  whatsappAccessTokenEnc: { not: null },
} as const;

/**
 * Lembretes WhatsApp:
 * - ~24h antes (janela +20h…+26h, ainda sem whatsappReminderSentAt)
 * - ~2h antes (janela +90min…+150min, ainda sem whatsappNearReminderSentAt)
 *
 * Chamar via `npm run whatsapp:jobs` ou `GET|POST /api/cron/whatsapp-jobs`.
 */
export async function runWhatsAppReminders(): Promise<{
  checked: number;
  sent: number;
  sentDay: number;
  sentNear: number;
}> {
  const now = new Date();
  const dayFrom = addHours(now, 20);
  const dayUntil = addHours(now, 26);
  const nearFrom = addMinutes(now, 90);
  const nearUntil = addMinutes(now, 150);

  const [dayRows, nearRows] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        whatsappReminderSentAt: null,
        startsAt: { gt: dayFrom, lte: dayUntil },
        unit: { organization: ORG_WA_FILTER },
      },
      include: {
        service: { select: { name: true } },
        unit: { select: { organizationId: true } },
      },
      take: 80,
    }),
    prisma.appointment.findMany({
      where: {
        status: "CONFIRMED",
        whatsappNearReminderSentAt: null,
        startsAt: { gt: nearFrom, lte: nearUntil },
        unit: { organization: ORG_WA_FILTER },
      },
      include: {
        service: { select: { name: true } },
        unit: { select: { organizationId: true } },
      },
      take: 80,
    }),
  ]);

  let sentDay = 0;
  let sentNear = 0;

  for (const ap of dayRows) {
    const orgId = ap.unit?.organizationId;
    if (!orgId) continue;
    const ok = await sendClientWhatsAppReminder({
      organizationId: orgId,
      appointment: ap,
      variant: "day",
    });
    if (ok) {
      await prisma.appointment.update({
        where: { id: ap.id },
        data: { whatsappReminderSentAt: new Date() },
      });
      sentDay += 1;
    }
  }

  for (const ap of nearRows) {
    const orgId = ap.unit?.organizationId;
    if (!orgId) continue;
    const ok = await sendClientWhatsAppReminder({
      organizationId: orgId,
      appointment: ap,
      variant: "near",
    });
    if (ok) {
      await prisma.appointment.update({
        where: { id: ap.id },
        data: { whatsappNearReminderSentAt: new Date() },
      });
      sentNear += 1;
    }
  }

  return {
    checked: dayRows.length + nearRows.length,
    sent: sentDay + sentNear,
    sentDay,
    sentNear,
  };
}
