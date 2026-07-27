const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Tokens do seed demo (sha256 truncado) e possíveis legado sem hífens. */
const HEX32_RE = /^[0-9a-f]{32}$/i;

/**
 * Formato aceito no link `/minha-reserva/[token]`:
 * - UUID (`randomUUID()` nas reservas reais)
 * - 32 hex (seed demo / legado)
 */
export function isClientManageTokenFormat(value: string): boolean {
  const t = value.trim();
  if (t.length < 32 || t.length > 40) return false;
  return UUID_RE.test(t) || HEX32_RE.test(t);
}
