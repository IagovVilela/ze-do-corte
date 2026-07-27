import "server-only";

import { unitNameMapByIds } from "@/lib/appointment-unit-names";
import { appointmentListWhere } from "@/lib/admin-appointment-list-where";
import type { AdminListFiltersParsed } from "@/lib/admin-list-url";
import { prisma } from "@/lib/prisma";
import { staffLabelMapByIds } from "@/lib/staff-display-names";
import type { StaffAccess } from "@/lib/staff-access";
import type { AppointmentRow } from "@/lib/types";

const MAX_RANGE_MS = 31 * 24 * 60 * 60 * 1000;
const MAX_ROWS = 500;

export class AppointmentRangeError extends Error {
  constructor(
    message: string,
    readonly code: "RANGE_TOO_LARGE" | "INVALID_RANGE",
  ) {
    super(message);
    this.name = "AppointmentRangeError";
  }
}

/**
 * Lista agendamentos no intervalo `[from, to]` (inclusive), no âmbito do staff.
 */
export async function listAdminAppointmentsInRange(
  access: StaffAccess,
  from: Date,
  to: Date,
  listFilters: AdminListFiltersParsed = {},
): Promise<AppointmentRow[]> {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new AppointmentRangeError("Intervalo inválido.", "INVALID_RANGE");
  }
  if (to.getTime() < from.getTime()) {
    throw new AppointmentRangeError(
      "A data final deve ser após a inicial.",
      "INVALID_RANGE",
    );
  }
  if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
    throw new AppointmentRangeError(
      "Intervalo máximo de 31 dias.",
      "RANGE_TOO_LARGE",
    );
  }

  const whereBase = appointmentListWhere(access, listFilters);
  const where = {
    AND: [whereBase, { startsAt: { gte: from, lte: to } }],
  };

  const baseSelect = {
    id: true,
    clientName: true,
    clientPhone: true,
    clientEmail: true,
    startsAt: true,
    endsAt: true,
    status: true,
    unitId: true,
    staffMemberId: true,
    paidAt: true,
    paymentMethod: true,
    amountPaid: true,
    paymentStatus: true,
    bookingSource: true,
    clientManageToken: true,
    service: { select: { name: true } },
  } as const;

  type ListItem = {
    id: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string | null;
    startsAt: Date;
    endsAt: Date;
    status: AppointmentRow["status"];
    unitId: string | null;
    staffMemberId: string | null;
    paidAt: Date | null;
    paymentMethod: string | null;
    amountPaid: unknown;
    paymentStatus: NonNullable<AppointmentRow["paymentStatus"]> | string | null;
    bookingSource: string | null;
    clientManageToken: string | null;
    service: { name: string };
    items: { service: { name: string } }[];
  };

  let items: ListItem[];
  try {
    items = (await prisma.appointment.findMany({
      where,
      take: MAX_ROWS,
      orderBy: { startsAt: "asc" },
      select: {
        ...baseSelect,
        items: {
          orderBy: { sortOrder: "asc" },
          select: { service: { select: { name: true } } },
        },
      },
    })) as ListItem[];
  } catch (err) {
    // Schema antigo sem AppointmentItem: lista pelo serviço principal.
    console.warn(
      "[admin-appointments] fallback sem items:",
      err instanceof Error ? err.message.split("\n")[0] : err,
    );
    const plain = await prisma.appointment.findMany({
      where,
      take: MAX_ROWS,
      orderBy: { startsAt: "asc" },
      select: baseSelect,
    });
    items = plain.map((row) => ({ ...row, items: [] })) as ListItem[];
  }

  const unitNames = await unitNameMapByIds(items.map((i) => i.unitId));
  const staffLabels = await staffLabelMapByIds(
    items.map((i) => i.staffMemberId),
  );

  return items.map((item) => {
    const serviceNames =
      item.items.length > 0
        ? item.items.map((i) => i.service.name)
        : [item.service.name];
    return {
      id: item.id,
      clientName: item.clientName,
      clientPhone: item.clientPhone ?? "",
      clientEmail: item.clientEmail,
      serviceName: serviceNames.join(", "),
      serviceNames,
      startsAt: item.startsAt.toISOString(),
      endsAt: item.endsAt.toISOString(),
      status: item.status,
      unitName: item.unitId ? (unitNames.get(item.unitId) ?? null) : null,
      unitId: item.unitId,
      staffMemberId: item.staffMemberId,
      assignedStaffLabel: item.staffMemberId
        ? (staffLabels.get(item.staffMemberId) ?? null)
        : null,
      paidAt: item.paidAt?.toISOString() ?? null,
      paymentMethod: item.paymentMethod,
      amountPaid: item.amountPaid != null ? Number(item.amountPaid) : null,
      paymentStatus: (item.paymentStatus ?? undefined) as
        | AppointmentRow["paymentStatus"]
        | undefined,
      bookingSource: item.bookingSource,
      clientManageToken: item.clientManageToken,
    };
  });
}
