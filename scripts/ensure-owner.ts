/**
 * Garante um utilizador OWNER para /admin/login no arranque (Docker/Railway).
 * Corre após `prisma migrate deploy` em `npm run start:prod`.
 *
 * - Em **produção**: só corre se `SEED_OWNER_EMAIL` e `SEED_OWNER_PASSWORD` estiverem definidos.
 *   Idempotente: se o utilizador já existir com senha, não altera.
 * - Fora de produção: se faltarem variáveis, sai em silêncio (use `npm run db:seed` para dados completos).
 *
 * Não usa `dotenv`: variáveis vêm do ambiente (Railway) ou do `.env` local quando corres `npm run ensure-owner`.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { resolveDatabaseUrlForCli } from "../prisma/database-url";
import { hashPassword } from "../src/lib/password";
import { MIN_PASSWORD_LENGTH } from "../src/lib/password-policy";

async function main() {
  const isProd = process.env.NODE_ENV === "production";
  const emailRaw = process.env.SEED_OWNER_EMAIL?.trim();
  const password = process.env.SEED_OWNER_PASSWORD;

  if (!emailRaw || !password) {
    if (isProd) {
      console.warn(
        "[ensure-owner] Produção: defina SEED_OWNER_EMAIL e SEED_OWNER_PASSWORD para criar o proprietário no deploy (ou corra `npm run db:seed` com DATABASE_PUBLIC_URL no PC).",
      );
    }
    return;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_OWNER_PASSWORD deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
  }

  const connectionString = resolveDatabaseUrlForCli();
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const ownerEmail = emailRaw.toLowerCase();
  const ownerHash = await hashPassword(password);

  try {
    const existing = await prisma.staffMember.findUnique({
      where: { email: ownerEmail },
    });
    if (!existing) {
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
    } else if (!existing.passwordHash) {
      await prisma.staffMember.update({
        where: { email: ownerEmail },
        data: { passwordHash: ownerHash },
      });
      console.log(`[ensure-owner] Senha definida para: ${ownerEmail}`);
    } else {
      console.log(`[ensure-owner] Proprietário já existe: ${ownerEmail}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[ensure-owner]", e);
  process.exit(1);
});
