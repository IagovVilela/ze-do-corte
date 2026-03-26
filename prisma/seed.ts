import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL nao definida. Use o .env ou PREPARAR_BASE.bat.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const services = [
    {
      name: "Corte Premium",
      description:
        "Consultoria de visagismo, corte personalizado e finalização profissional.",
      price: 75,
      durationMinutes: 45,
      isActive: true,
    },
    {
      name: "Barba Terapia",
      description:
        "Aparar e desenhar barba com toalha quente, óleos essenciais e navalha.",
      price: 55,
      durationMinutes: 35,
      isActive: true,
    },
    {
      name: "Combo Corte + Barba",
      description:
        "Experiência completa com corte premium e barba terapia no mesmo atendimento.",
      price: 115,
      durationMinutes: 75,
      isActive: true,
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { name: service.name },
      update: {
        description: service.description,
        price: service.price,
        durationMinutes: service.durationMinutes,
        isActive: service.isActive,
      },
      create: service,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
