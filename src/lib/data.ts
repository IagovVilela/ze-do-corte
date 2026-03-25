import { prisma } from "@/lib/prisma";

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
}

export async function getServices() {
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
}
