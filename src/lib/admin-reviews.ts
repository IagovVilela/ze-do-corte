import "server-only";

import { formatBrPhoneNational } from "@/lib/br-phone-format";
import type {
  AdminReviewRow,
  AdminReviewsSnapshot,
} from "@/lib/admin-reviews-types";
import { prisma } from "@/lib/prisma";

export type { AdminReviewRow, AdminReviewsSnapshot } from "@/lib/admin-reviews-types";

function firstName(full: string | null | undefined): string {
  const first = full?.trim().split(/\s+/)[0];
  if (!first) return "Cliente";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export async function getAdminReviewsSnapshot(
  organizationId: string,
  options?: {
    rating?: number | null;
    page?: number;
    pageSize?: number;
  },
): Promise<AdminReviewsSnapshot> {
  const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 30));
  const page = Math.max(1, options?.page ?? 1);
  const skip = (page - 1) * pageSize;
  const rating =
    options?.rating != null &&
    Number.isInteger(options.rating) &&
    options.rating >= 1 &&
    options.rating <= 5
      ? options.rating
      : null;

  const where = {
    organizationId,
    ...(rating != null ? { rating } : {}),
  };

  const [org, totalFiltered, rows] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { ratingAvg: true, ratingCount: true },
    }),
    prisma.organizationReview.count({ where }),
    prisma.organizationReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip,
      select: {
        id: true,
        rating: true,
        comment: true,
        clientName: true,
        clientPhone: true,
        createdAt: true,
        appointment: {
          select: {
            startsAt: true,
            service: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return {
    ratingAvg: org?.ratingAvg != null ? Number(org.ratingAvg) : null,
    ratingCount: org?.ratingCount ?? 0,
    page,
    pageSize,
    totalFiltered,
    ratingFilter: rating,
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      clientDisplayName: firstName(r.clientName),
      clientPhone: formatBrPhoneNational(r.clientPhone) || r.clientPhone,
      createdAt: r.createdAt.toISOString(),
      appointment: r.appointment
        ? {
            startsAt: r.appointment.startsAt.toISOString(),
            serviceName: r.appointment.service.name,
          }
        : null,
    })),
  };
}
