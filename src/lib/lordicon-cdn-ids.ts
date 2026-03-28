import type { LordIconSlot } from "@/lib/lordicon-slots";

/**
 * Ícones gratuitos servidos em https://cdn.lordicon.com/{id}.json (sem API key).
 * IDs estáveis usados na documentação / exemplos públicos Lordicon.
 * @see https://lordicon.com/docs/web
 */
export const LORDICON_CDN_BASE = "https://cdn.lordicon.com";

/** Hash do arquivo JSON no CDN por slot da UI. */
export const LORDICON_SLOT_CDN_ID: Record<LordIconSlot, string> = {
  /** Documento / agenda */
  schedule: "nocovwne",
  /** Seta / avançar (check animado) */
  arrow: "yqzmiobz",
  /** Contato / usuário */
  phone: "kthelypq",
  /** Mensagem / interação (cadeado outline com animação) */
  chat: "lbjtvqiv",
  /** Destaque / compartilhamento */
  social: "lewtedlh",
};
