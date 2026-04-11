/**
 * Garante um utilizador OWNER para /admin/login no arranque (Docker/Railway).
 * Corre após `prisma migrate deploy` em `npm run start:prod`.
 *
 * - Em **produção**: só corre se `SEED_OWNER_EMAIL` e `SEED_OWNER_PASSWORD` estiverem definidos.
 *   Idempotente: se o utilizador já existir com senha, não altera.
 * - Fora de produção: se faltarem variáveis, sai em silêncio (use `npm run db:seed` para dados completos).
 *
 * Em produção o Next também executa a mesma lógica em `src/instrumentation.ts` (reforço se o start
 * for só `next start` sem este script).
 *
 * Não usa `dotenv`: variáveis vêm do ambiente (Railway) ou do `.env` local quando corres `npm run ensure-owner`.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { resolveDatabaseUrlForCli } from "../prisma/database-url";
import { ensureOwnerWithPrisma } from "../src/lib/ensure-owner-with-prisma";
import { MIN_PASSWORD_LENGTH } from "../src/lib/password-policy";

/**
 * Mesmo critério que `src/lib/prisma.ts`: na Railway o serviço da app tem `DATABASE_URL`
 * (rede interna). Não preferir `DATABASE_PUBLIC_URL` aqui — senão o script podia escrever noutro
 * destino que o login da API (que só usa `DATABASE_URL`).
 */
function connectionStringForEnsureOwner(): string {
  const internal = process.env.DATABASE_URL?.trim();
  if (internal) {
    return internal;
  }
  return resolveDatabaseUrlForCli();
}

async function main() {
  const isProd = process.env.NODE_ENV === "production";
  const emailRaw = process.env.SEED_OWNER_EMAIL?.trim();
  const password = process.env.SEED_OWNER_PASSWORD?.trim();

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

  const connectionString = connectionStringForEnsureOwner();
  console.log(
    `[ensure-owner] Ligação: ${process.env.DATABASE_URL?.trim() ? "DATABASE_URL (igual à app)" : "fallback (ex.: DATABASE_PUBLIC_URL no PC)"}`,
  );
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    await ensureOwnerWithPrisma(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[ensure-owner]", e);
  process.exit(1);
});
