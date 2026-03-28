/** Apenas dígitos, máx. 11 (DDD + celular BR sem +55). */
export function brPhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/**
 * Máscara progressiva estilo Brasil: (DD) NNNNN-NNNN ou (DD) NNNN-NNNN.
 * Entrada: string com ou sem máscara; apenas os dígitos são considerados.
 */
export function formatBrPhoneNational(value: string): string {
  const d = brPhoneDigits(value);
  if (d.length === 0) return "";

  const dd = d.slice(0, 2);
  const rest = d.slice(2);

  if (d.length <= 2) {
    return `(${dd}`;
  }

  if (rest.length <= 4) {
    return `(${dd}) ${rest}`;
  }

  if (d.length <= 10) {
    return `(${dd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  return `(${dd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

/** Valor normalizado para persistir (máscara completa ou null se vazio). */
export function normalizeBrProfilePhone(input: string | null | undefined): string | null {
  if (input == null) return null;
  const d = brPhoneDigits(input);
  if (d.length === 0) return null;
  return formatBrPhoneNational(d);
}
