import { BARBER_CONTACT_LINKS } from "@/lib/constants";

/** WhatsApp: URL direto (ex. api.whatsapp.com) ou, em alternativa, `wa.me` com dígitos. */
export function getWhatsappContactHref(): string | null {
  const href = BARBER_CONTACT_LINKS.whatsappHref.trim();
  if (href) return href;
  const digits = BARBER_CONTACT_LINKS.whatsappDigits.trim();
  if (digits) return `https://wa.me/${digits}`;
  return null;
}

/**
 * Instagram: URL completo (perfil ou link da bio).
 * Se vazio, monta `instagram.com/{usuario}` a partir de `instagramUser`.
 */
export function getInstagramContactHref(): string | null {
  const href = BARBER_CONTACT_LINKS.instagramHref.trim();
  if (href) return href;
  const user = BARBER_CONTACT_LINKS.instagramUser.trim().replace(/^@/, "");
  if (user) return `https://instagram.com/${user}`;
  return null;
}

export function hasAnySocialContactLink(): boolean {
  return getWhatsappContactHref() !== null || getInstagramContactHref() !== null;
}
