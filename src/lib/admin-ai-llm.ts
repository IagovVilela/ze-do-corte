import "server-only";

/**
 * Cliente LLM compartilhado (OpenAI-compat / Gemini AI Studio).
 * Usado por briefing, rascunho WhatsApp e leitura de relatórios.
 */

export function isAdminAiEnabled(): boolean {
  const flag = process.env.MORNING_BRIEFING_AI_ENABLED?.trim().toLowerCase();
  if (flag !== "1" && flag !== "true" && flag !== "yes") return false;
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function callAdminAiChat(opts: {
  system: string;
  user: string;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model =
    process.env.MORNING_BRIEFING_AI_MODEL?.trim() || "gpt-4o-mini";
  const base =
    process.env.OPENAI_BASE_URL?.trim().replace(/\/$/, "") ||
    "https://api.openai.com/v1";

  const isGemini =
    base.includes("generativelanguage.googleapis.com") ||
    model.toLowerCase().startsWith("gemini");

  const messages = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ];

  async function post(withJsonObject: boolean) {
    const body: Record<string, unknown> = {
      model,
      temperature: opts.temperature ?? 0.5,
      messages,
    };
    if (withJsonObject && !isGemini) {
      body.response_format = { type: "json_object" };
    }
    return fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 12_000),
    });
  }

  let res: Response;
  try {
    res = await post(!isGemini);
    if (!res.ok && !isGemini) {
      res = await post(false);
    }
  } catch (err) {
    console.error("[admin-ai-llm] fetch", err);
    return null;
  }

  if (!res.ok) {
    console.error(
      "[admin-ai-llm] HTTP",
      res.status,
      await res.text().catch(() => ""),
    );
    return null;
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  let content = json.choices?.[0]?.message?.content?.trim();
  if (!content) return null;

  const fence = content.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fence?.[1]) content = fence[1].trim();
  return content;
}

export function parseAiJsonObject(content: string): unknown | null {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}
