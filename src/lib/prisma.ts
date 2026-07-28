import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Incrementar quando modelos novos forem adicionados ao schema (força trocar
 * o singleton em hot-reload).
 */
const PRISMA_CLIENT_GENERATION = 17;

type PrismaBundle = {
  generation: number;
  client: PrismaClient;
  pool: Pool;
};

const globalForPrisma = globalThis as unknown as {
  bnPrisma?: PrismaBundle;
  /** Legado — limpar se ainda existir. */
  prismaV2?: PrismaClient;
  prismaPoolV2?: Pool;
};

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/postgres";

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
  return new PrismaClient({
    adapter: new PrismaPg(pool),
    log:
      process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

/** Prisma 7 pode expor o delegate em camelCase ou (em alguns bundles) PascalCase. */
function modelDelegate(
  client: PrismaClient,
  camel: string,
  pascal: string,
): { findMany?: unknown } | undefined {
  const c = client as unknown as Record<string, { findMany?: unknown } | undefined>;
  return c[camel] ?? c[pascal];
}

function clientLooksHealthy(client: PrismaClient): boolean {
  // Sessão/auth é o mínimo absoluto do painel.
  const session = modelDelegate(client, "session", "Session");
  const staff = modelDelegate(client, "staffMember", "StaffMember");
  return (
    typeof session?.findMany === "function" &&
    typeof staff?.findMany === "function"
  );
}

function retireBundle(bundle: PrismaBundle | undefined) {
  if (!bundle) return;
  void bundle.client.$disconnect().catch(() => undefined);
  // Em dev não chama pool.end() — requests em voo quebravam com pool already ended.
  if (process.env.NODE_ENV === "production") {
    void bundle.pool.end().catch(() => undefined);
  }
}

function getClient(): PrismaClient {
  const current = globalForPrisma.bnPrisma;
  if (
    current &&
    current.generation === PRISMA_CLIENT_GENERATION &&
    clientLooksHealthy(current.client)
  ) {
    return current.client;
  }

  if (current) {
    retireBundle(current);
    globalForPrisma.bnPrisma = undefined;
  }

  if (globalForPrisma.prismaV2 || globalForPrisma.prismaPoolV2) {
    if (globalForPrisma.prismaV2) {
      void globalForPrisma.prismaV2.$disconnect().catch(() => undefined);
    }
    globalForPrisma.prismaV2 = undefined;
    globalForPrisma.prismaPoolV2 = undefined;
  }

  const pool = createPool();
  const client = createPrismaClient(pool);

  if (!clientLooksHealthy(client)) {
    // Não derruba o processo com throw genérico de Product — deixa a query
    // real falhar com a mensagem do Prisma (mais útil) e loga diagnóstico.
    const keys = Object.keys(client as object).filter(
      (k) => !k.startsWith("$") && !k.startsWith("_"),
    );
    console.error(
      "[prisma] Client sem delegates esperados (session/staffMember). Chaves:",
      keys.slice(0, 40),
      "— limpe `.next`, rode `npx prisma generate` e reinicie o `next dev`.",
    );
  }

  globalForPrisma.bnPrisma = {
    generation: PRISMA_CLIENT_GENERATION,
    client,
    pool,
  };
  return client;
}

/**
 * Proxy: resolve sempre o singleton. Receiver = client (getters do Prisma 7).
 * Também mapeia PascalCase → camelCase se o bundle só expuser PascalCase.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (prop === "then" || prop === "$$typeof") return undefined;

    const client = getClient();

    if (typeof prop === "string") {
      const direct = Reflect.get(client, prop, client);
      if (direct !== undefined) {
        if (typeof direct === "function") {
          return (direct as (...args: unknown[]) => unknown).bind(client);
        }
        return direct;
      }

      // Fallback: Product → product (e vice-versa) para bundles inconsistentes.
      const alt =
        prop[0] === prop[0]?.toUpperCase()
          ? prop[0]!.toLowerCase() + prop.slice(1)
          : prop[0]!.toUpperCase() + prop.slice(1);
      const viaAlt = Reflect.get(client, alt, client);
      if (viaAlt !== undefined) {
        if (typeof viaAlt === "function") {
          return (viaAlt as (...args: unknown[]) => unknown).bind(client);
        }
        return viaAlt;
      }
    }

    const value = Reflect.get(client, prop, client);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
