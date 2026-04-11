/**
 * Corre uma vez por instância Node ao iniciar o servidor Next.
 * Em produção, reforça a criação do OWNER a partir de `SEED_OWNER_*` (idempotente),
 * para cenários em que o comando de arranque não executa `scripts/ensure-owner.ts`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const { ensureOwnerWithPrisma } = await import("@/lib/ensure-owner-with-prisma");
    await ensureOwnerWithPrisma(prisma);
  } catch (e) {
    console.error("[instrumentation/ensure-owner]", e);
  }
}
