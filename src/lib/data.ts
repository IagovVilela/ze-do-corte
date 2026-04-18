import { Prisma } from "@prisma/client";

import { getDefaultBarbershopUnitId } from "@/lib/barbershop-unit";
import { prisma } from "@/lib/prisma";
import type { PublicBarber } from "@/lib/types";

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

export async function ensureSeedServices() {
  try {
    const count = await prisma.service.count();
    if (count > 0) return;

    await prisma.service.createMany({
      data: SERVICE_SEED.map((service) => ({
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price,
        category: service.category,
        isActive: true,
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

export async function getServices() {
  try {
    await ensureSeedServices();
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });

    return services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      price: Number(service.price),
    }));
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[data] getServices: base indisponível — a devolver lista vazia (evita 500 na página).",
        );
      }
      return [];
    }
    throw error;
  }
}

/** Barbeiros (`STAFF`) da unidade padrão — opções no formulário de agendamento. */
export async function getBarbersForBooking(): Promise<
  { id: string; name: string; imageUrl: string | null }[]
> {
  try {
    const unitId = await getDefaultBarbershopUnitId();
    if (!unitId) return [];

    const rows = await prisma.staffMember.findMany({
      where: { role: "STAFF", unitId },
      select: { id: true, displayName: true, email: true, profileImageUrl: true },
      orderBy: [{ displayName: "asc" }, { email: "asc" }],
    });

    return rows.map((r) => {
      const name =
        r.displayName?.trim() ||
        (r.email.includes("@") ? r.email.split("@")[0] : r.email) ||
        "Profissional";
      return { id: r.id, name, imageUrl: r.profileImageUrl ?? null };
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[data] getBarbersForBooking: base indisponível — a devolver lista vazia.",
        );
      }
      return [];
    }
    throw error;
  }
}

/** Funcionários (`STAFF`) marcados para aparecer na página inicial. */
export async function getPublicBarbers(): Promise<PublicBarber[]> {
  try {
    const rows = await prisma.staffMember.findMany({
      where: { role: "STAFF", showOnWebsite: true },
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
        console.warn(
          "[data] getPublicBarbers: base indisponível — a devolver lista vazia.",
        );
      }
      return [];
    }
    throw error;
  }
}

/** Unidades ativas da barbearia para exibir na página inicial. */
export async function getPublicBarbershopUnits() {
  try {
    const units = await prisma.barbershopUnit.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        addressLine: true,
        city: true,
        isDefault: true,
      },
    });
    return units;
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[data] getPublicBarbershopUnits: base indisponível — a devolver lista vazia.",
        );
      }
      return [];
    }
    throw error;
  }
}
