import "server-only";

import { addHours } from "date-fns";

import { prisma } from "@/lib/prisma";
import { sendClientWhatsAppReminder } from "@/lib/whatsapp-notify-client";

/**
 * Envia lembretes para confirmações nas próximas ~24h sem whatsappReminderSentAt.
 * Chamar via `npm run whatsapp:reminders` (cron Railway / start periodico).
 */
export async function runWhatsAppReminders(): Promise<{
  checked: number;
  sent: number;
}> {
  const now = new Date();
  const until = addHours(now, 26);

  const rows = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      whatsappReminderSentAt: null,
      startsAt: { gt: now, lte: until },
      unit: {
        organization: {
          whatsappBotEnabled: true,
          whatsappPhoneNumberId: { not: null },
          whatsappAccessTokenEnc: { not: null },
        },
      },
    },
    include: {
      service: { select: { name: true } },
      unit: { select: { organizationId: true } },
    },
    take: 80,
  });

  let sent = 0;
  for (const ap of rows) {
    const orgId = ap.unit?.organizationId;
    if (!orgId) continue;
    const ok = await sendClientWhatsAppReminder({
      organizationId: orgId,
      appointment: ap,
    });
    if (ok) {
      await prisma.appointment.update({
        where: { id: ap.id },
        data: { whatsappReminderSentAt: new Date() },
      });
      sent += 1;
    }
  }

  return { checked: rows.length, sent };
}
