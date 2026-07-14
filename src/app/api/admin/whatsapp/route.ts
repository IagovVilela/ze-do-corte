import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { phoneToWhatsAppHref } from "@/lib/phone-to-whatsapp-link";
import { prisma } from "@/lib/prisma";
import {
  encryptSecret,
  isWhatsAppTokenEncryptionConfigured,
} from "@/lib/whatsapp-crypto";
import { isMetaWhatsAppPlatformConfigured } from "@/lib/whatsapp-meta-client";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  whatsappBotEnabled: z.boolean().optional(),
  whatsappPhoneNumberId: z.string().trim().min(3).max(64).nullable().optional(),
  whatsappWabaId: z.string().trim().min(3).max(64).nullable().optional(),
  whatsappDisplayPhone: z.string().trim().max(32).nullable().optional(),
  /** Token em texto claro — será criptografado no servidor. null limpa. */
  whatsappAccessToken: z.string().trim().min(10).max(500).nullable().optional(),
  disconnect: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageBranding) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: auth.access.organizationId },
    select: {
      whatsappBotEnabled: true,
      whatsappPhoneNumberId: true,
      whatsappWabaId: true,
      whatsappDisplayPhone: true,
      whatsappConnectedAt: true,
      whatsappAccessTokenEnc: true,
    },
  });

  const logs = await prisma.whatsAppOutboundLog.findMany({
    where: { organizationId: auth.access.organizationId },
    orderBy: { createdAt: "desc" },
    take: 15,
    select: {
      id: true,
      kind: true,
      status: true,
      waUserPhone: true,
      errorMessage: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    platform: {
      webhookConfigured: isMetaWhatsAppPlatformConfigured(),
      encryptionConfigured: isWhatsAppTokenEncryptionConfigured(),
      appId: process.env.META_APP_ID?.trim() || null,
      graphVersion: process.env.META_GRAPH_VERSION?.trim() || "v21.0",
      templateConfirmation:
        process.env.META_WA_TEMPLATE_CONFIRMATION?.trim() || null,
      templateReminder: process.env.META_WA_TEMPLATE_REMINDER?.trim() || null,
    },
    connection: {
      whatsappBotEnabled: org?.whatsappBotEnabled ?? false,
      whatsappPhoneNumberId: org?.whatsappPhoneNumberId ?? null,
      whatsappWabaId: org?.whatsappWabaId ?? null,
      whatsappDisplayPhone: org?.whatsappDisplayPhone ?? null,
      whatsappConnectedAt: org?.whatsappConnectedAt?.toISOString() ?? null,
      hasAccessToken: Boolean(org?.whatsappAccessTokenEnc),
    },
    logs,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageBranding) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.disconnect) {
    await prisma.organization.update({
      where: { id: auth.access.organizationId },
      data: {
        whatsappBotEnabled: false,
        whatsappPhoneNumberId: null,
        whatsappWabaId: null,
        whatsappAccessTokenEnc: null,
        whatsappConnectedAt: null,
      },
    });
    return NextResponse.json({
      ok: true,
      disconnected: true,
      message: "Assistente desligado. Seu número no site continua igual.",
    });
  }

  if (data.whatsappAccessToken !== undefined && data.whatsappAccessToken) {
    if (!isWhatsAppTokenEncryptionConfigured()) {
      return NextResponse.json(
        {
          message:
            "A plataforma ainda não está pronta para o assistente. Fale com o suporte Barbernegon.",
        },
        { status: 503 },
      );
    }
  }

  let tokenEnc: string | null | undefined;
  if (data.whatsappAccessToken === null) tokenEnc = null;
  else if (typeof data.whatsappAccessToken === "string") {
    tokenEnc = encryptSecret(data.whatsappAccessToken);
  }

  const waHref =
    data.whatsappDisplayPhone !== undefined && data.whatsappDisplayPhone
      ? phoneToWhatsAppHref(data.whatsappDisplayPhone)
      : undefined;

  const org = await prisma.organization.update({
    where: { id: auth.access.organizationId },
    data: {
      ...(data.whatsappBotEnabled !== undefined
        ? { whatsappBotEnabled: data.whatsappBotEnabled }
        : {}),
      ...(data.whatsappPhoneNumberId !== undefined
        ? { whatsappPhoneNumberId: data.whatsappPhoneNumberId }
        : {}),
      ...(data.whatsappWabaId !== undefined
        ? { whatsappWabaId: data.whatsappWabaId }
        : {}),
      ...(data.whatsappDisplayPhone !== undefined
        ? { whatsappDisplayPhone: data.whatsappDisplayPhone }
        : {}),
      ...(waHref ? { whatsappHref: waHref } : {}),
      ...(tokenEnc !== undefined
        ? {
            whatsappAccessTokenEnc: tokenEnc,
            whatsappConnectedAt: tokenEnc ? new Date() : null,
          }
        : {}),
    },
    select: {
      whatsappBotEnabled: true,
      whatsappPhoneNumberId: true,
      whatsappWabaId: true,
      whatsappDisplayPhone: true,
      whatsappConnectedAt: true,
      whatsappAccessTokenEnc: true,
      whatsappHref: true,
    },
  });

  return NextResponse.json({
    ok: true,
    message: "WhatsApp atualizado.",
    connection: {
      whatsappBotEnabled: org.whatsappBotEnabled,
      whatsappPhoneNumberId: org.whatsappPhoneNumberId,
      whatsappWabaId: org.whatsappWabaId,
      whatsappDisplayPhone: org.whatsappDisplayPhone,
      whatsappConnectedAt: org.whatsappConnectedAt?.toISOString() ?? null,
      hasAccessToken: Boolean(org.whatsappAccessTokenEnc),
      whatsappHref: org.whatsappHref,
    },
  });
}
