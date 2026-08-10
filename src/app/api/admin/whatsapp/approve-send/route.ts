import { NextResponse } from "next/server";
import { z } from "zod";

import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { normalizeWaUserPhone } from "@/lib/booking-domain";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { decryptSecret } from "@/lib/whatsapp-crypto";
import { sendWhatsAppText } from "@/lib/whatsapp-meta-client";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  phone: z.string().min(8).max(32),
  message: z.string().trim().min(5).max(900),
});

/**
 * Envia mensagem via Cloud API (sessão 24h). Clientes frios podem falhar —
 * nesse caso a UI deve oferecer wa.me.
 */
export async function POST(request: Request) {
  const access = await getStaffAccessOrNull();
  if (!access) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }
  if (access.role !== "OWNER" && access.role !== "ADMIN") {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const ip = clientIpFromRequest(request);
  const limited = checkRateLimit(
    `wa-approve-send:${access.organizationId}:${ip}`,
    { limit: 40, windowMs: 60 * 60 * 1000 },
  );
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: access.organizationId },
    select: {
      whatsappBotEnabled: true,
      whatsappPhoneNumberId: true,
      whatsappAccessTokenEnc: true,
    },
  });
  if (
    !org?.whatsappBotEnabled ||
    !org.whatsappPhoneNumberId ||
    !org.whatsappAccessTokenEnc
  ) {
    return NextResponse.json(
      {
        ok: false,
        code: "NOT_CONFIGURED",
        message:
          "WhatsApp Cloud API não configurado. Use Abrir WhatsApp (wa.me) ou configure em /admin/whatsapp.",
      },
      { status: 400 },
    );
  }

  let accessToken: string;
  try {
    accessToken = decryptSecret(org.whatsappAccessTokenEnc);
  } catch {
    return NextResponse.json(
      { ok: false, code: "DECRYPT", message: "Falha ao ler credenciais WhatsApp." },
      { status: 500 },
    );
  }

  const waUserPhone = normalizeWaUserPhone(parsed.data.phone);
  if (!waUserPhone) {
    return NextResponse.json(
      { ok: false, code: "PHONE", message: "Telefone inválido." },
      { status: 400 },
    );
  }

  const result = await sendWhatsAppText({
    phoneNumberId: org.whatsappPhoneNumberId,
    accessToken,
    toE164Digits: waUserPhone,
    text: parsed.data.message,
  });

  await prisma.whatsAppOutboundLog.create({
    data: {
      organizationId: access.organizationId,
      waUserPhone,
      kind: "BOT_REPLY",
      metaMessageId: result.ok ? result.messageId : null,
      status: result.ok ? "sent" : "error",
      errorMessage: result.ok ? null : result.error,
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        code: "META",
        message:
          "Envio pela API falhou (janela de 24h ou template). Use Abrir WhatsApp.",
        detail: result.error,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, messageId: result.messageId });
}
