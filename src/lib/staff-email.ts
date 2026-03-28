import { z } from "zod";

/**
 * E-mail para `StaffMember` e login do painel.
 * Mais permissivo que `z.email()` (aceita domínio sem TLD, ex.: `user@intranet`).
 */
export const staffEmailSchema = z
  .string()
  .trim()
  .min(3)
  .regex(/^[^\s@]+@[^\s@]+$/, "E-mail inválido.");
