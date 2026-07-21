import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { resolveDatabaseUrlForCli } from "./database-url";
import {
  DEMO_ORG_BRANDING,
  DEMO_ORG_ID,
  DEMO_ORG_SLUG,
  demoSiteJson,
} from "./demo-vitrine";
import { hashPassword } from "../src/lib/password";
import { MIN_PASSWORD_LENGTH } from "../src/lib/password-policy";

const connectionString = resolveDatabaseUrlForCli();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const siteJson = demoSiteJson();

  const org = await prisma.organization.upsert({
    where: { slug: DEMO_ORG_SLUG },
    create: {
      id: DEMO_ORG_ID,
      slug: DEMO_ORG_SLUG,
      planStatus: "ACTIVE",
      timezone: "America/Sao_Paulo",
      marketplaceListed: true,
      ...DEMO_ORG_BRANDING,
      siteJson,
    },
    update: {
      planStatus: "ACTIVE",
      marketplaceListed: true,
      ...DEMO_ORG_BRANDING,
      siteJson,
    },
  });

  const unit = await prisma.barbershopUnit.upsert({
    where: {
      organizationId_slug: { organizationId: org.id, slug: "matriz" },
    },
    create: {
      organizationId: org.id,
      name: "Unidade matriz",
      slug: "matriz",
      isDefault: true,
      isActive: true,
      city: "São José dos Campos",
    },
    update: {
      isDefault: true,
      isActive: true,
      organizationId: org.id,
    },
  });

  await prisma.appointment.updateMany({
    where: { unitId: null },
    data: { unitId: unit.id },
  });

  const ownerEmail = (
    process.env.SEED_OWNER_EMAIL ?? "admin@zdc.local"
  ).toLowerCase();
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "AlterarSenha123!";
  if (ownerPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_OWNER_PASSWORD deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
  }
  const ownerHash = await hashPassword(ownerPassword);
  const existingOwner = await prisma.staffMember.findUnique({
    where: { email: ownerEmail },
  });
  if (!existingOwner) {
    await prisma.staffMember.create({
      data: {
        email: ownerEmail,
        displayName: "Proprietário (seed)",
        role: "OWNER",
        passwordHash: ownerHash,
        unitId: null,
        organizationId: org.id,
      },
    });
    console.log(
      `[seed] Criado proprietário: ${ownerEmail} (org ${org.slug}).`,
    );
  } else {
    await prisma.staffMember.update({
      where: { email: ownerEmail },
      data: {
        organizationId: org.id,
        ...(!existingOwner.passwordHash ? { passwordHash: ownerHash } : {}),
      },
    });
    console.log(`[seed] Proprietário alinhado à org ${org.slug}: ${ownerEmail}`);
  }

  const services = [
    {
      name: "Corte Premium",
      description:
        "Consultoria de visagismo, corte personalizado e finalização profissional.",
      price: 75,
      durationMinutes: 45,
      isActive: true,
      category: "CORTE" as const,
    },
    {
      name: "Barba Terapia",
      description:
        "Aparar e desenhar barba com toalha quente, óleos essenciais e navalha.",
      price: 55,
      durationMinutes: 35,
      isActive: true,
      category: "BARBA" as const,
    },
    {
      name: "Combo Corte + Barba",
      description:
        "Experiência completa com corte premium e barba terapia no mesmo atendimento.",
      price: 115,
      durationMinutes: 75,
      isActive: true,
      category: "COMBO" as const,
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: {
        unitId_name: {
          unitId: unit.id,
          name: service.name,
        },
      },
      update: {
        description: service.description,
        price: service.price,
        durationMinutes: service.durationMinutes,
        isActive: service.isActive,
        category: service.category,
      },
      create: {
        ...service,
        unitId: unit.id,
      },
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
