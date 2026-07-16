/**
 * Normalização e fuzzy match de nomes de cidade (pt-BR).
 * Exemplos: "sao" → "São José dos Campos"; "sao jose" → mesma cidade.
 */

export function normalizeCityKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (curr[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j] ?? 0;
  }
  return prev[b.length] ?? 0;
}

function maxDistanceFor(len: number): number {
  if (len <= 4) return 1;
  if (len <= 8) return 2;
  return 3;
}

/** Uma cidade cadastrada “bate” com o que o usuário digitou? */
export function cityMatchesQuery(
  query: string,
  city: string | null | undefined,
): boolean {
  const q = normalizeCityKey(query);
  if (!q) return true;
  if (q.length < 2) return true; // ainda digitando
  const n = normalizeCityKey(city ?? "");
  if (!n) return false;

  if (n === q || n.includes(q) || q.includes(n)) return true;

  const qTokens = q.split(" ").filter(Boolean);
  const nTokens = n.split(" ").filter(Boolean);

  // "sao jose" → tokens de "sao jose dos campos"
  if (
    qTokens.length > 0 &&
    qTokens.every((t) =>
      nTokens.some((nt) => nt.startsWith(t) || t.startsWith(nt) || nt.includes(t)),
    )
  ) {
    return true;
  }

  // Prefixo em qualquer palavra: "sao" → São / São José…
  if (qTokens.length === 1) {
    const t = qTokens[0]!;
    if (nTokens.some((nt) => nt.startsWith(t))) return true;
  }

  const dist = levenshtein(q, n);
  if (dist <= maxDistanceFor(Math.min(q.length, n.length))) return true;

  // Typo em uma palavra longa da cidade
  for (const nt of nTokens) {
    if (nt.length < 4) continue;
    if (levenshtein(q, nt) <= maxDistanceFor(Math.min(q.length, nt.length))) {
      return true;
    }
  }

  return false;
}

/**
 * Dado o texto digitado e a lista de cidades reais no banco,
 * devolve as grafias originais que devem entrar no filtro.
 */
export function resolveFuzzyCityMatches(
  query: string,
  knownCities: string[],
): string[] {
  const q = normalizeCityKey(query);
  if (!q || q.length < 2) return [];

  const matched = new Set<string>();
  for (const city of knownCities) {
    const trimmed = city.trim();
    if (!trimmed) continue;
    if (cityMatchesQuery(q, trimmed)) matched.add(trimmed);
  }
  return [...matched];
}
