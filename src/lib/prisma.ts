import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Incrementar quando o schema Prisma ganhar modelos novos em hot-reload de desenvolvimento
 * (ex.: Organization), para descartar o PrismaClient antigo guardado em `globalThis`.
 * Chave `prismaV2` evita reaproveitar client antigo de hot-reload (ratingAvg/ratingCount).
 */
const PRISMA_CLIENT_GENERATION = 7;

const globalForPrisma = globalThis as unknown as {
  prismaV2: PrismaClient | undefined;
  prismaPoolV2: Pool | undefined;
  prismaGenerationV2?: number;
};

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres";

/**
 * Pool explícito: evita múltiplos clients sem limite (sensação de “travado”
 * quando o Postgres da Railway fica sem conexões) e define timeout de aquisição.
 */
function createPool() {
  return new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: false,
  });
}

function createPrismaClient(pool: Pool) {
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });
}

if (
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prismaV2 &&
  globalForPrisma.prismaGenerationV2 !== PRISMA_CLIENT_GENERATION
) {
  void globalForPrisma.prismaV2.$disconnect().catch(() => undefined);
  void globalForPrisma.prismaPoolV2?.end().catch(() => undefined);
  globalForPrisma.prismaV2 = undefined;
  globalForPrisma.prismaPoolV2 = undefined;
}

function getClient(): PrismaClient {
  if (globalForPrisma.prismaV2) return globalForPrisma.prismaV2;
  const pool = globalForPrisma.prismaPoolV2 ?? createPool();
  const client = createPrismaClient(pool);
  // Sempre singleton (também em produção): Next pode carregar o módulo
  // várias vezes em chunks distintos e esgotar conexões do Postgres.
  globalForPrisma.prismaPoolV2 = pool;
  globalForPrisma.prismaV2 = client;
  globalForPrisma.prismaGenerationV2 = PRISMA_CLIENT_GENERATION;
  return client;
}

export const prisma = getClient();
