import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import { hashPassword } from "./password";
import { MIN_PASSWORD_LENGTH } from "./password-policy";

/**
 * Garante um `StaffMember` OWNER com senha a partir de `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD`.
 * Idempotente: se já existir com `passwordHash`, não altera.
 *
 * Usado por `scripts/ensure-owner.ts` e por `src/instrumentation.ts` (produção) como reforço
 * quando o comando de arranque não inclui o script (ex.: só `next start`).
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

  if (!existing.passwordHash) {
    await prisma.staffMember.update({
      where: { email: ownerEmail },
      data: { passwordHash: ownerHash },
    });
    console.log(`[ensure-owner] Senha definida para: ${ownerEmail}`);
    return;
  }

  console.log(`[ensure-owner] Proprietário já existe: ${ownerEmail}`);
}
