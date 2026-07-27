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
export function phoneToWhatsAppHref(
  phone: string,
  prefilledText?: string,
): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;

  let base: string;
  // Internacional explícito (+…) — não força DDI 55
  if (trimmed.startsWith("+")) {
    base = `https://wa.me/${digits}`;
  } else {
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    if (withCountry.length < 12 || withCountry.length > 13) return null;
    base = `https://wa.me/${withCountry}`;
  }

  const text = prefilledText?.trim();
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

/** Mensagem padrão de reativação (CRM / “WhatsApp hoje”). */
export function crmWinBackWhatsAppText(clientName: string): string {
  const first = clientName.trim().split(/\s+/)[0] || "tudo bem";
  return `Oi ${first}! Sentimos sua falta aqui na barbearia. Que tal marcar um horário? Estamos com horários bons esta semana.`;
}
