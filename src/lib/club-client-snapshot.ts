import "server-only";

import { brPhoneDigits } from "@/lib/br-phone-format";
import { prisma } from "@/lib/prisma";

export type ClubClientSnapshot = {
  planName: string;
  status: string;
  visitsUsed: number;
  visitsIncluded: number | null;
  /** null = ilimitado */
  visitsRemaining: number | null;
  currentPeriodEnd: string | null;
};

/** Assinatura ativa (ou melhor status) do telefone na org. */
export async function getClubSnapshotByPhone(
  organizationId: string,
  clientPhone: string,
): Promise<ClubClientSnapshot | null> {
  const key = brPhoneDigits(clientPhone);
  if (key.length < 10) return null;

  const now = new Date();
  const rows = await prisma.clientSubscription.findMany({
    where: { organizationId },
    include: {
      plan: { select: { name: true, visitsIncluded: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

  const match = rows.find((r) => brPhoneDigits(r.clientPhone) === key);
  if (!match) return null;

  // Prefere ACTIVE com período válido.
  const active = rows.find(
    (r) =>
      brPhoneDigits(r.clientPhone) === key &&
      r.status === "ACTIVE" &&
      r.currentPeriodEnd > now,
  );
  const sub = active ?? match;
  const included = sub.plan.visitsIncluded;
  const remaining =
    included == null ? null : Math.max(0, included - sub.visitsUsed);

  return {
    planName: sub.plan.name,
    status: sub.status,
    visitsUsed: sub.visitsUsed,
    visitsIncluded: included,
    visitsRemaining: remaining,
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
  };
}

export function clubBadgeLabel(snap: ClubClientSnapshot): string {
  if (snap.visitsRemaining == null) {
    return `Clube — ilimitado (${snap.planName})`;
  }
  return `Clube — ${snap.visitsRemaining} visita${snap.visitsRemaining === 1 ? "" : "s"} restante${snap.visitsRemaining === 1 ? "" : "s"}`;
}
