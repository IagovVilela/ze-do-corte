import "server-only";

import webpush from "web-push";

import { prisma } from "@/lib/prisma";
import { getVapidWebPushOptions, isWebPushConfigured } from "@/lib/web-push-config";

export type StaffBookingPushPayload = {
  title: string;
  body: string;
  url?: string;
};

/**
 * Envia notificação Web Push a todas as subscrições do profissional.
 * Remove da base registos inválidos (410/404).
 */
export async function sendStaffBookingPush(
  staffMemberId: string,
  payload: StaffBookingPushPayload,
): Promise<void> {
  if (!isWebPushConfigured()) return;

  const opts = getVapidWebPushOptions();
  webpush.setVapidDetails(opts.subject, opts.publicKey, opts.privateKey);

  const subs = await prisma.staffPushSubscription.findMany({
    where: { staffMemberId },
  });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  const deadIds: string[] = [];

  for (const s of subs) {
    const subscription = {
      endpoint: s.endpoint,
      keys: { p256dh: s.p256dh, auth: s.auth },
    };
    try {
      await webpush.sendNotification(subscription, body, { TTL: 86_400 });
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "statusCode" in err
          ? (err as { statusCode?: number }).statusCode
          : undefined;
      if (status === 404 || status === 410) {
        deadIds.push(s.id);
      } else {
        console.error("[push-notify-staff] envio falhou", err);
      }
    }
  }

  if (deadIds.length > 0) {
    await prisma.staffPushSubscription.deleteMany({
      where: { id: { in: deadIds } },
    });
  }
}
