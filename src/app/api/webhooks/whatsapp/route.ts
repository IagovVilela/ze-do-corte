import { NextResponse } from "next/server";

import { handleWhatsAppInbound } from "@/lib/whatsapp-bot-fsm";
import {
  isMetaAppSecretConfigured,
  verifyMetaWebhookSignature,
} from "@/lib/whatsapp-meta-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Verificação do webhook Meta (hub.challenge). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ message: "Forbidden" }, { status: 403 });
}

type WaChangeValue = {
  metadata?: { phone_number_id?: string };
  messages?: Array<{
    from?: string;
    id?: string;
    type?: string;
    text?: { body?: string };
    button?: { payload?: string; text?: string };
    interactive?: {
      type?: string;
      button_reply?: { id?: string; title?: string };
      list_reply?: { id?: string; title?: string };
    };
  }>;
};

/**
 * Eventos inbound. Responde 200 rápido; processa async.
 * Tenant = Organization.whatsappPhoneNumberId.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!isMetaAppSecretConfigured()) {
    return NextResponse.json(
      { message: "Webhook não configurado (META_APP_SECRET)." },
      { status: 503 },
    );
  }
  const sig = request.headers.get("x-hub-signature-256");
  if (!verifyMetaWebhookSignature(rawBody, sig)) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    object?: string;
    entry?: Array<{
      changes?: Array<{ value?: WaChangeValue; field?: string }>;
    }>;
  };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  // Ack imediato — Meta exige resposta rápida
  const work = (async () => {
    if (payload.object !== "whatsapp_business_account") return;
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value?.messages?.length) continue;
        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        const org = await prisma.organization.findFirst({
          where: {
            whatsappPhoneNumberId: phoneNumberId,
            whatsappBotEnabled: true,
          },
          select: { id: true },
        });
        if (!org) continue;

        for (const msg of value.messages) {
          if (!msg.from) continue;
          const buttonOrListId =
            msg.interactive?.button_reply?.id ||
            msg.interactive?.list_reply?.id ||
            msg.button?.payload ||
            undefined;
          const text =
            msg.text?.body ||
            msg.interactive?.button_reply?.title ||
            msg.interactive?.list_reply?.title ||
            msg.button?.text ||
            "";

          try {
            await handleWhatsAppInbound({
              organizationId: org.id,
              incoming: {
                from: msg.from,
                text,
                buttonOrListId,
              },
            });
          } catch (err) {
            console.error("[whatsapp webhook] handler error", err);
          }
        }
      }
    }
  })();

  void work;

  return NextResponse.json({ ok: true }, { status: 200 });
}
