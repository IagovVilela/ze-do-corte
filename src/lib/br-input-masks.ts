/**
 * Máscaras progressivas pt-BR para inputs (sem lib externa).
 * Telefone: reexporta `br-phone-format`.
 */

export {
  brPhoneDigits,
  formatBrPhoneNational,
  normalizeBrProfilePhone,
} from "@/lib/br-phone-format";

/** Só dígitos, opcionalmente limitados. */
export function onlyDigits(value: string, maxLen?: number): string {
  const d = value.replace(/\D/g, "");
  return maxLen != null ? d.slice(0, maxLen) : d;
}

/** CPF `000.000.000-00` ou CNPJ `00.000.000/0000-00` conforme o tamanho. */
export function formatCpfCnpj(value: string): string {
  const d = onlyDigits(value, 14);
  if (d.length <= 11) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) {
      return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    }
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  }
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function cpfCnpjDigits(value: string): string {
  return onlyDigits(value, 14);
}

/** CEP `00000-000`. */
export function formatCep(value: string): string {
  const d = onlyDigits(value, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/**
 * Dinheiro BRL estilo caixa (centavos): digitar `7900` → `79,00`.
 * Aceita string já mascarada ou só dígitos.
 */
export function formatBrMoneyInput(value: string): string {
  const d = onlyDigits(value, 12);
  if (!d) return "";
  const cents = Number.parseInt(d, 10);
  if (!Number.isFinite(cents)) return "";
  const whole = Math.floor(cents / 100);
  const frac = (cents % 100).toString().padStart(2, "0");
  return `${whole.toLocaleString("pt-BR")},${frac}`;
}

/** Inicializa máscara a partir de um número (ex.: 79 → `79,00`). */
export function formatBrMoneyFromNumber(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  return formatBrMoneyInput(String(Math.round(n * 100)));
}

/** Converte valor mascarado/digitado em número (reais). */
export function parseBrMoneyInput(value: string): number {
  const d = onlyDigits(value);
  if (!d) return 0;
  return Number.parseInt(d, 10) / 100;
}

/** Inteiro só com dígitos (duração, ciclo, visitas…). */
export function formatIntegerDigits(value: string, maxLen = 8): string {
  return onlyDigits(value, maxLen);
}

export function parseIntegerDigits(value: string, fallback = 0): number {
  const d = onlyDigits(value);
  if (!d) return fallback;
  const n = Number.parseInt(d, 10);
  return Number.isFinite(n) ? n : fallback;
}
