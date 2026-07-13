import { Prisma } from "@prisma/client";

import { getDefaultBarbershopUnitId } from "@/lib/barbershop-unit";
import { prisma } from "@/lib/prisma";
import type { PublicBarber, ServiceSummary } from "@/lib/types";

function isDatabaseConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P1001" || error.code === "P1017";
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /ECONNREFUSED|Can't reach database|P1001|P1017/i.test(message);
}

function mapServiceToSummary(
  service: {
    id: string;
    name: string;
    description: string;
    durationMinutes: number;
    price: Prisma.Decimal;
    unitId: string;
    isActive: boolean;
    unitOverrides?: Array<{
      unitId: string;
      price: Prisma.Decimal | null;
      durationMinutes: number | null;
      isActive: boolean;
    }>;
  },
): ServiceSummary {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    durationMinutes: service.durationMinutes,
    price: Number(service.price),
    unitId: service.unitId,
    isActive: service.isActive,
    ...(service.unitOverrides?.length
      ? {
          unitOverrides: service.unitOverrides.map((o) => ({
            unitId: o.unitId,
            price: o.price != null ? Number(o.price) : null,
            durationMinutes: o.durationMinutes,
            isActive: o.isActive,
          })),
        }
      : {}),
  };
}

const SERVICE_SEED = [
  {
    name: "Corte Premium",
    description:
      "Consultoria de visagismo, corte personalizado e finalização profissional.",
    durationMinutes: 45,
    price: 75,
    category: "CORTE" as const,
  },
  {
    name: "Barba Terapia",
    description:
      "Aparar e desenhar barba com toalha quente, óleos essenciais e navalha.",
    durationMinutes: 35,
    price: 55,
    category: "BARBA" as const,
  },
  {
    name: "Combo Corte + Barba",
    description:
      "Experiência completa com corte premium e barba terapia no mesmo atendimento.",
    durationMinutes: 75,
    price: 115,
    category: "COMBO" as const,
  },
];

async function ensureOrgUnitForSeed(organizationId: string): Promise<string | null> {
  try {
    const unit = await prisma.barbershopUnit.upsert({
      where: {
        organizationId_slug: { organizationId, slug: "matriz" },
      },
      create: {
        organizationId,
        name: "Unidade matriz",
        slug: "matriz",
        isDefault: true,
        isActive: true,
      },
      update: { isActive: true },
      select: { id: true },
    });
    return unit.id;
  } catch {
    return null;
  }
}

export async function ensureSeedServices(organizationId: string) {
  try {
    const count = await prisma.service.count({
      where: { unit: { organizationId } },
    });
    if (count > 0) return;

    const unitId =
      (await getDefaultBarbershopUnitId(organizationId)) ??
      (await ensureOrgUnitForSeed(organizationId));
    if (!unitId) return;

    await prisma.service.createMany({
      data: SERVICE_SEED.map((service) => ({
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price,
        category: service.category,
        isActive: true,
        unitId,
      })),
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[data] ensureSeedServices: base indisponível — a ignorar seed automático.",
        );
      }
      return;
    }
    throw error;
  }
}

/** Serviços ativos da unidade padrão da organização. */
export async function getServices(organizationId: string): Promise<ServiceSummary[]> {
  try {
    await ensureSeedServices(organizationId);
    const unitId = await getDefaultBarbershopUnitId(organizationId);
    if (!unitId) return [];

    const services = await prisma.service.findMany({
      where: { isActive: true, unitId },
      orderBy: { createdAt: "asc" },
      include: { unitOverrides: true },
    });

    return services.map(mapServiceToSummary);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[data] getServices: base indisponível — lista vazia.");
      }
      return [];
    }
    throw error;
  }
}

/** Serviços ativos da organização (todas as unidades). */
export async function getServicesForBooking(
  organizationId: string,
): Promise<ServiceSummary[]> {
  try {
    await ensureSeedServices(organizationId);
    const services = await prisma.service.findMany({
      where: { isActive: true, unit: { organizationId } },
      orderBy: [{ unitId: "asc" }, { createdAt: "asc" }],
      include: { unitOverrides: true },
    });

    return services.map(mapServiceToSummary);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[data] getServicesForBooking: base indisponível — lista vazia.");
      }
      return [];
    }
    throw error;
  }
}

export async function getBarbersForBooking(
  organizationId: string,
): Promise<
  { id: string; name: string; imageUrl: string | null; unitId: string | null }[]
> {
  try {
    const rows = await prisma.staffMember.findMany({
      where: { role: "STAFF", organizationId },
      select: {
        id: true,
        displayName: true,
        email: true,
        profileImageUrl: true,
        unitId: true,
      },
      orderBy: [{ displayName: "asc" }, { email: "asc" }],
    });

    return rows.map((r) => {
      const name =
        r.displayName?.trim() ||
        (r.email.includes("@") ? r.email.split("@")[0] : r.email) ||
        "Profissional";
      return {
        id: r.id,
        name,
        imageUrl: r.profileImageUrl ?? null,
        unitId: r.unitId,
      };
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[data] getBarbersForBooking: base indisponível — lista vazia.");
      }
      return [];
    }
    throw error;
  }
}

export async function getPublicBarbers(
  organizationId: string,
): Promise<PublicBarber[]> {
  try {
    const rows = await prisma.staffMember.findMany({
      where: { role: "STAFF", showOnWebsite: true, organizationId },
      select: {
        id: true,
        displayName: true,
        email: true,
        websiteBio: true,
        profileImageUrl: true,
      },
      orderBy: [{ displayName: "asc" }, { email: "asc" }],
    });

    return rows.map((r) => {
      const name =
        r.displayName?.trim() ||
        (r.email.includes("@") ? r.email.split("@")[0] : r.email) ||
        "Equipe";
      return {
        id: r.id,
        name,
        bio: r.websiteBio?.trim() || null,
        imageUrl: r.profileImageUrl,
      };
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[data] getPublicBarbers: base indisponível — lista vazia.");
      }
      return [];
    }
    throw error;
  }
}

export async function getPublicBarbershopUnits(organizationId: string) {
  try {
    return await prisma.barbershopUnit.findMany({
      where: { isActive: true, organizationId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        addressLine: true,
        city: true,
        isDefault: true,
      },
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[data] getPublicBarbershopUnits: base indisponível — lista vazia.",
        );
      }
      return [];
    }
    throw error;
  }
}
