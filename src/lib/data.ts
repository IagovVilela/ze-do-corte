import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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
  },
  {
    name: "Barba Terapia",
    description:
      "Aparar e desenhar barba com toalha quente, óleos essenciais e navalha.",
    durationMinutes: 35,
    price: 55,
  },
  {
    name: "Combo Corte + Barba",
    description:
      "Experiência completa com corte premium e barba terapia no mesmo atendimento.",
    durationMinutes: 75,
    price: 115,
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
