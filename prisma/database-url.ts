/**
 * URL para CLI local (seed, migrate, create-owner) contra Postgres na Railway.
 * `postgres.railway.internal` não resolve fora da cloud — no painel do Postgres ative
 * TCP público e copie o URL para `DATABASE_PUBLIC_URL` no `.env` local.
 */
export function resolveDatabaseUrlForCli(): string {
  const pub = process.env.DATABASE_PUBLIC_URL?.trim();
  const def = process.env.DATABASE_URL?.trim();
  const url = pub || def;
  if (!url) {
    throw new Error(
      "Defina DATABASE_URL ou DATABASE_PUBLIC_URL (URL público do Postgres na Railway para uso no PC).",
    );
  }
  return url;
}
