import { formatBrPhoneNational } from "@/lib/br-phone-format";

/**
 * Máscara do campo “número WhatsApp” no admin:
 * - começa com `+` → internacional (ex. número de teste Meta `+15551540355`)
 * - senão → máscara BR `(DD) …`
 */
export function formatWhatsAppDisplayInput(value: string): string {
  const raw = value.trimStart();
  if (raw.startsWith("+")) {
    const digits = raw.replace(/\D/g, "").slice(0, 15);
    return digits.length > 0 ? `+${digits}` : "+";
  }
  return formatBrPhoneNational(value);
}

/** Normaliza telefone e monta link wa.me para o site. */
export function phoneToWhatsAppHref(phone: string): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;

  // Internacional explícito (+…) — não força DDI 55
  if (trimmed.startsWith("+")) {
    return `https://wa.me/${digits}`;
  }

  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  if (withCountry.length < 12 || withCountry.length > 13) return null;
  return `https://wa.me/${withCountry}`;
}
