/** Lê JSON de Response sem estourar em corpo vazio / HTML de erro. */
export async function readResponseJson<T extends Record<string, unknown>>(
  res: Response,
): Promise<T & { message?: string }> {
  const text = await res.text();
  if (!text.trim()) {
    return {
      message: res.ok
        ? undefined
        : `Erro ${res.status}: resposta vazia do servidor.`,
    } as T & { message?: string };
  }
  try {
    return JSON.parse(text) as T & { message?: string };
  } catch {
    return {
      message: res.ok
        ? "Resposta inválida do servidor."
        : `Erro ${res.status}: resposta inválida.`,
    } as T & { message?: string };
  }
}
