import "server-only";

import { ensureOwnerWithPrisma } from "@/lib/ensure-owner-with-prisma";
import { prisma } from "@/lib/prisma";

/**
 * Só é importado em runtime Node (ver `src/instrumentation.ts`).
 * Mantém `pg`/`prisma` fora do grafo que o Webpack tenta analisar no cliente.
 */
export async function runEnsureOwnerOnBoot() {
  await ensureOwnerWithPrisma(prisma);
}
