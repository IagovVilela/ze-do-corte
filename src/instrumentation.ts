/**
 * Em produção o OWNER já é criado por `npm run start:prod` → `ensure-owner.ts`.
 * O import dinâmico de `./instrumentation.node` quebrava no bundle Docker
 * (ERR_MODULE_NOT_FOUND) e só gerava ruído/risco no arranque.
 */
export async function register() {
  // intencionalmente vazio — auth e seed no start script
}
