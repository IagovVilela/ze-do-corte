import "server-only";

import { formatBrPhoneNational } from "@/lib/br-phone-format";
import {
  clubBadgeLabel,
  getClubSnapshotByPhone,
} from "@/lib/club-client-snapshot";
import { prisma } from "@/lib/prisma";
import { appointmentScopeWhere, type StaffAccess } from "@/lib/staff-access";

export type ComandaServiceLine = {
  id: string;
  serviceId: string;
  name: string;
  price: number;
  durationMinutes: number;
};

export type ComandaProductLine = {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type ComandaHistoryVisit = {
  id: string;
  startsAt: string;
  staffLabel: string | null;
  services: string[];
  products: string[];
};

export type ComandaRepurchaseHint = {
  kind: "service" | "product";
  id: string;
  name: string;
  lastAt: string;
};

export type AppointmentComanda = {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  startsAt: string;
  endsAt: string;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED";
  unitName: string | null;
  unitId: string | null;
  staffMemberId: string | null;
  assignedStaffLabel: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  amountPaid: number | null;
  paymentStatus: string;
  bookingSource: string | null;
  clientManageToken: string | null;
  services: ComandaServiceLine[];
  products: ComandaProductLine[];
  servicesTotal: number;
  productsTotal: number;
  grandTotal: number;
  history: ComandaHistoryVisit[];
  repurchase: ComandaRepurchaseHint[];
  club: {
    planName: string;
    status: string;
    visitsUsed: number;
    visitsIncluded: number | null;
    visitsRemaining: number | null;
    badgeLabel: string;
  } | null;
  /** Sugestão de upsell (produto ativo não na comanda). */
  upsell: { productId: string; name: string; price: number } | null;
};

export async function getAppointmentComanda(
  access: StaffAccess,
  appointmentId: string,
): Promise<AppointmentComanda | null> {
  const appt = await prisma.appointment.findFirst({
    where: {
      AND: [appointmentScopeWhere(access), { id: appointmentId }],
    },
    include: {
      service: { select: { id: true, name: true, price: true, durationMinutes: true } },
      unit: { select: { name: true } },
      staffMember: { select: { displayName: true, email: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          service: {
            select: { id: true, name: true },
          },
        },
      },
      products: {
        include: { product: { select: { id: true, name: true } } },
      },
    },
  });
  if (!appt) return null;

  const services: ComandaServiceLine[] =
    appt.items.length > 0
      ? appt.items.map((i) => ({
          id: i.id,
          serviceId: i.serviceId,
          name: i.service.name,
          price: Number(i.price),
          durationMinutes: i.durationMinutes,
        }))
      : [
          {
            id: "primary",
            serviceId: appt.serviceId,
            name: appt.service.name,
            price: Number(appt.service.price),
            durationMinutes: appt.service.durationMinutes,
          },
        ];

  const products: ComandaProductLine[] = appt.products.map((p) => ({
    id: p.id,
    productId: p.productId,
    name: p.product.name,
    quantity: p.quantity,
    unitPrice: Number(p.unitPrice),
  }));

  const servicesTotal = services.reduce((s, i) => s + i.price, 0);
  const productsTotal = products.reduce(
    (s, i) => s + i.unitPrice * i.quantity,
    0,
  );

  const phone = formatBrPhoneNational(appt.clientPhone);
  const historyRows = await prisma.appointment.findMany({
    where: {
      AND: [
        appointmentScopeWhere(access),
        { clientPhone: phone },
        { id: { not: appointmentId } },
        { status: { in: ["COMPLETED", "CONFIRMED"] } },
      ],
    },
    orderBy: { startsAt: "desc" },
    take: 8,
    include: {
      service: { select: { name: true } },
      staffMember: { select: { displayName: true, email: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        include: { service: { select: { name: true, id: true } } },
      },
      products: {
        include: { product: { select: { id: true, name: true } } },
      },
    },
  });

  const history: ComandaHistoryVisit[] = historyRows.map((h) => ({
    id: h.id,
    startsAt: h.startsAt.toISOString(),
    staffLabel:
      h.staffMember?.displayName?.trim() || h.staffMember?.email || null,
    services:
      h.items.length > 0
        ? h.items.map((i) => i.service.name)
        : [h.service.name],
    products:
      h.products.length > 0
        ? h.products.map((p) =>
            p.quantity > 1
              ? `${p.product.name} ×${p.quantity}`
              : p.product.name,
          )
        : [],
  }));

  const currentServiceIds = new Set(services.map((s) => s.serviceId));
  const currentProductIds = new Set(products.map((p) => p.productId));
  const lastService = new Map<string, { name: string; at: Date }>();
  const lastProduct = new Map<string, { name: string; at: Date }>();

  for (const h of historyRows) {
    const svcList =
      h.items.length > 0
        ? h.items.map((i) => ({ id: i.service.id, name: i.service.name }))
        : [{ id: h.serviceId, name: h.service.name }];
    for (const s of svcList) {
      if (!lastService.has(s.id)) {
        lastService.set(s.id, { name: s.name, at: h.startsAt });
      }
    }
    for (const p of h.products) {
      if (!lastProduct.has(p.productId)) {
        lastProduct.set(p.productId, {
          name: p.product.name,
          at: p.soldAt,
        });
      }
    }
  }

  const repurchase: ComandaRepurchaseHint[] = [];
  for (const [id, v] of lastService) {
    if (!currentServiceIds.has(id)) {
      repurchase.push({
        kind: "service",
        id,
        name: v.name,
        lastAt: v.at.toISOString(),
      });
    }
  }
  for (const [id, v] of lastProduct) {
    if (!currentProductIds.has(id)) {
      repurchase.push({
        kind: "product",
        id,
        name: v.name,
        lastAt: v.at.toISOString(),
      });
    }
  }
  repurchase.sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );

  const clubSnap = await getClubSnapshotByPhone(
    access.organizationId,
    appt.clientPhone,
  );

  const upsellProduct = await prisma.product.findFirst({
    where: {
      organizationId: access.organizationId,
      isActive: true,
      id: { notIn: [...currentProductIds] },
      OR: [{ stockQty: null }, { stockQty: { gt: 0 } }],
    },
    orderBy: { price: "desc" },
    select: { id: true, name: true, price: true },
  });

  return {
    id: appt.id,
    clientName: appt.clientName,
    clientPhone: appt.clientPhone,
    clientEmail: appt.clientEmail,
    startsAt: appt.startsAt.toISOString(),
    endsAt: appt.endsAt.toISOString(),
    status: appt.status,
    unitName: appt.unit?.name ?? null,
    unitId: appt.unitId,
    staffMemberId: appt.staffMemberId,
    assignedStaffLabel:
      appt.staffMember?.displayName?.trim() ||
      appt.staffMember?.email ||
      null,
    paidAt: appt.paidAt?.toISOString() ?? null,
    paymentMethod: appt.paymentMethod,
    amountPaid: appt.amountPaid != null ? Number(appt.amountPaid) : null,
    paymentStatus: appt.paymentStatus,
    bookingSource: appt.bookingSource,
    clientManageToken: appt.clientManageToken,
    services,
    products,
    servicesTotal,
    productsTotal,
    grandTotal: servicesTotal + productsTotal,
    history,
    repurchase: repurchase.slice(0, 6),
    club: clubSnap
      ? {
          planName: clubSnap.planName,
          status: clubSnap.status,
          visitsUsed: clubSnap.visitsUsed,
          visitsIncluded: clubSnap.visitsIncluded,
          visitsRemaining: clubSnap.visitsRemaining,
          badgeLabel: clubBadgeLabel(clubSnap),
        }
      : null,
    upsell: upsellProduct
      ? {
          productId: upsellProduct.id,
          name: upsellProduct.name,
          price: Number(upsellProduct.price),
        }
      : null,
  };
}
