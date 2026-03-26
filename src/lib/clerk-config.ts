/**
 * Clerk só é ativado com chave publicável no formato esperado (pk_...).
 * Sem isso, a app corre em modo local sem auth (apenas em desenvolvimento).
 */
export function isClerkConfigured(): boolean {
  const k = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  return Boolean(k && k.startsWith("pk_") && k.length > 15);
}
