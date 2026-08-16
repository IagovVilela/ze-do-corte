/** Máscara de PII para o modo assistência do consultor. */

export function maskPhone(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  return `••• ••• ${digits.slice(-4)}`;
}

export function maskEmail(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const [user, domain] = value.split("@");
  if (!domain) return "•••";
  const u = user ?? "";
  const head = u.slice(0, 1) || "•";
  return `${head}•••@${domain}`;
}

export function maskCpfCnpj(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  return `•••.${digits.slice(-4)}`;
}

export function isSupportAssistRole(
  role: string | null | undefined,
): boolean {
  return role === "SUPPORT_ASSIST";
}

export function isSupportConsultantRole(
  role: string | null | undefined,
): boolean {
  return role === "SUPPORT_CONSULTANT";
}
