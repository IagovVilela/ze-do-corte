import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import {
  DEMO_ORG_BRANDING,
  DEMO_ORG_ID,
  DEMO_ORG_SLUG,
  demoSiteJson,
} from "@/lib/demo-vitrine";
import { hashPassword } from "./password";
import { MIN_PASSWORD_LENGTH } from "./password-policy";

/**
 * Garante Organization padrão + OWNER com senha a partir de SEED_OWNER_*.
 */
export async function ensureOwnerWithPrisma(prisma: PrismaClient): Promise<void> {
  const emailRaw = process.env.SEED_OWNER_EMAIL?.trim();
  const password = process.env.SEED_OWNER_PASSWORD?.trim();

  if (!emailRaw || !password) {
    return;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `[ensure-owner] SEED_OWNER_PASSWORD deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
    return;
  }

  const org = await prisma.organization.upsert({
    where: { slug: DEMO_ORG_SLUG },
    create: {
      id: DEMO_ORG_ID,
      slug: DEMO_ORG_SLUG,
      planStatus: "ACTIVE",
      timezone: "America/Sao_Paulo",
      marketplaceListed: true,
      ...DEMO_ORG_BRANDING,
      siteJson: demoSiteJson(),
    },
    update: {},
  });

  const ownerEmail = emailRaw.toLowerCase();
  console.log(`[ensure-owner] A processar OWNER para e-mail: ${ownerEmail}`);
  const ownerHash = await hashPassword(password);

  const existing = await prisma.staffMember.findUnique({
    where: { email: ownerEmail },
  });

  if (!existing) {
    try {
      await prisma.staffMember.create({
        data: {
          email: ownerEmail,
          displayName: "Proprietário",
          role: "OWNER",
          passwordHash: ownerHash,
          unitId: null,
          organizationId: org.id,
        },
      });
      console.log(`[ensure-owner] Criado OWNER: ${ownerEmail}`);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        console.log(`[ensure-owner] OWNER já existia (corrida no arranque): ${ownerEmail}`);
        return;
      }
      throw e;
    }
    return;
  }

  await prisma.staffMember.update({
    where: { email: ownerEmail },
    data: {
      organizationId: org.id,
      ...(!existing.passwordHash ? { passwordHash: ownerHash } : {}),
    },
  });
  console.log(`[ensure-owner] Proprietário alinhado: ${ownerEmail}`);
}
