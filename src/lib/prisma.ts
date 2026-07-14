import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Incrementar quando o schema Prisma ganhar modelos novos em hot-reload de desenvolvimento
 * (ex.: Organization), para descartar o PrismaClient antigo guardado em `globalThis`.
 */
const PRISMA_CLIENT_GENERATION = 5;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: Pool | undefined;
  prismaGeneration?: number;
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
  globalForPrisma.prisma &&
  globalForPrisma.prismaGeneration !== PRISMA_CLIENT_GENERATION
) {
  void globalForPrisma.prisma.$disconnect().catch(() => undefined);
  void globalForPrisma.prismaPool?.end().catch(() => undefined);
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaPool = undefined;
}

function getClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const pool = globalForPrisma.prismaPool ?? createPool();
  const client = createPrismaClient(pool);
  // Sempre singleton (também em produção): Next pode carregar o módulo
  // várias vezes em chunks distintos e esgotar conexões do Postgres.
  globalForPrisma.prismaPool = pool;
  globalForPrisma.prisma = client;
  globalForPrisma.prismaGeneration = PRISMA_CLIENT_GENERATION;
  return client;
}

export const prisma = getClient();
