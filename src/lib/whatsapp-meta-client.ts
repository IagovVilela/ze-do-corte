import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || "v21.0";

export function metaGraphBase(): string {
  return `https://graph.facebook.com/${GRAPH_VERSION}`;
}

export function isMetaWhatsAppPlatformConfigured(): boolean {
  // Verify token basta para challenge GET + liberar o painel.
  // META_APP_SECRET é opcional: quando existir, o POST valida assinatura.
  return Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN?.trim());
}

/** Se true, o webhook POST deve exigir X-Hub-Signature-256. */
export function isMetaAppSecretConfigured(): boolean {
  return Boolean(process.env.META_APP_SECRET?.trim());
}

export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = process.env.META_APP_SECRET?.trim();
  if (!secret || !signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(received, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type WhatsAppSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

type InteractiveButton = { id: string; title: string };
type InteractiveRow = { id: string; title: string; description?: string };

async function graphPost(
  phoneNumberId: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<WhatsAppSendResult> {
  const url = `${metaGraphBase()}/${phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    });
    const data = (await res.json()) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      return {
        ok: false,
        error: data.error?.message ?? `HTTP ${res.status}`,
      };
    }
    const id = data.messages?.[0]?.id ?? "";
    return { ok: true, messageId: id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha de rede Meta",
    };
  }
}

export async function sendWhatsAppText(options: {
  phoneNumberId: string;
  accessToken: string;
  toE164Digits: string;
  text: string;
}): Promise<WhatsAppSendResult> {
  return graphPost(options.phoneNumberId, options.accessToken, {
    to: options.toE164Digits,
    type: "text",
    text: { preview_url: false, body: options.text.slice(0, 4096) },
  });
}

export async function sendWhatsAppButtons(options: {
  phoneNumberId: string;
  accessToken: string;
  toE164Digits: string;
  body: string;
  buttons: InteractiveButton[];
}): Promise<WhatsAppSendResult> {
  const buttons = options.buttons.slice(0, 3).map((b) => ({
    type: "reply",
    reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) },
  }));
  return graphPost(options.phoneNumberId, options.accessToken, {
    to: options.toE164Digits,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: options.body.slice(0, 1024) },
      action: { buttons },
    },
  });
}

export async function sendWhatsAppList(options: {
  phoneNumberId: string;
  accessToken: string;
  toE164Digits: string;
  body: string;
  buttonLabel: string;
  sectionTitle: string;
  rows: InteractiveRow[];
}): Promise<WhatsAppSendResult> {
  const rows = options.rows.slice(0, 10).map((r) => ({
    id: r.id.slice(0, 200),
    title: r.title.slice(0, 24),
    ...(r.description
      ? { description: r.description.slice(0, 72) }
      : {}),
  }));
  return graphPost(options.phoneNumberId, options.accessToken, {
    to: options.toE164Digits,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: options.body.slice(0, 1024) },
      action: {
        button: options.buttonLabel.slice(0, 20),
        sections: [
          {
            title: options.sectionTitle.slice(0, 24),
            rows,
          },
        ],
      },
    },
  });
}

/** Template aprovado (nome + idioma + componentes). */
export async function sendWhatsAppTemplate(options: {
  phoneNumberId: string;
  accessToken: string;
  toE164Digits: string;
  templateName: string;
  languageCode?: string;
  bodyParameters?: string[];
}): Promise<WhatsAppSendResult> {
  const components =
    options.bodyParameters && options.bodyParameters.length
      ? [
          {
            type: "body",
            parameters: options.bodyParameters.map((text) => ({
              type: "text",
              text,
            })),
          },
        ]
      : undefined;
  return graphPost(options.phoneNumberId, options.accessToken, {
    to: options.toE164Digits,
    type: "template",
    template: {
      name: options.templateName,
      language: { code: options.languageCode ?? "pt_BR" },
      ...(components ? { components } : {}),
    },
  });
}
