/**
 * Cria ou atualiza um utilizador OWNER no PostgreSQL (login em /admin/login).
 *
 * Uso: defina no .env (ou no ambiente):
 *   CREATE_OWNER_EMAIL=voce@exemplo.com
 *   CREATE_OWNER_PASSWORD=senha_com_8_chars_min
 * Opcional: CREATE_OWNER_NAME=Nome no painel
 *
 * Depois: npm run create-owner
 *
 * Se CREATE_OWNER_* não existir, usa SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD como fallback.
 */
import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { resolveDatabaseUrlForCli } from "../prisma/database-url";

import { hashPassword } from "../src/lib/password";
import { MIN_PASSWORD_LENGTH } from "../src/lib/password-policy";

let connectionString: string;
try {
  connectionString = resolveDatabaseUrlForCli();
} catch (e) {
  console.error(
    "Erro:",
    e instanceof Error ? e.message : e,
    "\nConfigure DATABASE_URL ou DATABASE_PUBLIC_URL no .env (ver docs/railway.md).",
  );
  process.exit(1);
}

const emailRaw =
  process.env.CREATE_OWNER_EMAIL?.trim() ||
  process.env.SEED_OWNER_EMAIL?.trim();
const password = process.env.CREATE_OWNER_PASSWORD || process.env.SEED_OWNER_PASSWORD;
const displayName = process.env.CREATE_OWNER_NAME?.trim() || null;

if (!emailRaw) {
  console.error(
    "Erro: defina CREATE_OWNER_EMAIL ou SEED_OWNER_EMAIL no .env (e-mail do proprietário).",
  );
  process.exit(1);
}

const email = emailRaw.toLowerCase();

if (!password || password.length < MIN_PASSWORD_LENGTH) {
  console.error(
    `Erro: defina CREATE_OWNER_PASSWORD ou SEED_OWNER_PASSWORD com pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
  );
  process.exit(1);
}

const ownerPlainPassword: string = password;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const passwordHash = await hashPassword(ownerPlainPassword);
  const member = await prisma.staffMember.upsert({
    where: { email },
    create: {
      email,
      displayName,
      role: "OWNER",
      passwordHash,
      unitId: null,
    },
    update: {
      role: "OWNER",
      passwordHash,
      unitId: null,
      ...(displayName !== null ? { displayName } : {}),
    },
  });

  await prisma.session.deleteMany({ where: { staffMemberId: member.id } });

  console.log(`Proprietário pronto: ${member.email}`);
  console.log("Sessões antigas deste utilizador foram encerradas. Entre em /admin/login com a nova senha.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
