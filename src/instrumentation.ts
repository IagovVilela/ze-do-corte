import * as Sentry from "@sentry/nextjs";

/**
 * Hook de arranque do Next.
 * - Sentry: importa configs server/edge (só envia eventos se houver DSN).
 * - OWNER/seed: continua em `npm run start:prod` → `ensure-owner.ts`
 *   (evitar import Prisma aqui — quebrava o bundle Docker).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
