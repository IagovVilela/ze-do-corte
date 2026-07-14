import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import {
  AsaasApiError,
  asaasEnsureOrgWebhook,
  asaasPingApiKey,
} from "@/lib/asaas-client";
import {
  encryptAsaasSecret,
  isAsaasTokenEncryptionConfigured,
} from "@/lib/asaas-crypto";
import { prisma } from "@/lib/prisma";
import { getAsaasWebhookUrl } from "@/lib/public-app-url";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  asaasEnabled: z.boolean().optional(),
  asaasAccountEmail: z
    .string()
    .trim()
    .email()
    .optional()
    .nullable()
    .or(z.literal("")),
  asaasApiKey: z.string().trim().min(10).max(200).optional().or(z.literal("")),
});

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (
    auth.access.role !== "OWNER" &&
    !auth.access.permissions.manageSettings &&
    !auth.access.permissions.viewRevenue
  ) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: auth.access.organizationId },
    select: {
      asaasEnabled: true,
      asaasAccountEmail: true,
      asaasApiKeyEnc: true,
    },
  });

  const recent = await prisma.paymentEvent.findMany({
    where: { organizationId: auth.access.organizationId },
    orderBy: { processedAt: "desc" },
    take: 8,
    select: {
      id: true,
      event: true,
      paymentId: true,
      externalReference: true,
      processedAt: true,
    },
  });

  const webhookUrl = getAsaasWebhookUrl();
  const encryptionConfigured = isAsaasTokenEncryptionConfigured();
  const platformWebhookToken = Boolean(process.env.ASAAS_WEBHOOK_TOKEN?.trim());

  return NextResponse.json({
    platform: {
      encryptionConfigured,
      webhookTokenConfigured: platformWebhookToken,
      readyForShops: encryptionConfigured && platformWebhookToken,
      webhookUrl,
    },
    connection: {
      asaasEnabled: org?.asaasEnabled ?? false,
      asaasAccountEmail: org?.asaasAccountEmail ?? null,
      hasApiKey: Boolean(org?.asaasApiKeyEnc),
    },
    recentEvents: recent,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (auth.access.role !== "OWNER" && !auth.access.permissions.manageSettings) {
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

  const data: {
    asaasEnabled?: boolean;
    asaasAccountEmail?: string | null;
    asaasApiKeyEnc?: string;
  } = {};

  if (parsed.data.asaasEnabled !== undefined) {
    data.asaasEnabled = parsed.data.asaasEnabled;
  }
  if (parsed.data.asaasAccountEmail !== undefined) {
    data.asaasAccountEmail =
      parsed.data.asaasAccountEmail === ""
        ? null
        : parsed.data.asaasAccountEmail;
  }

  let webhookNote: string | null = null;
  let plainKeyForWebhook: string | null = null;

  if (parsed.data.asaasApiKey?.trim()) {
    if (!isAsaasTokenEncryptionConfigured()) {
      return NextResponse.json(
        {
          message:
            "A plataforma ainda não está pronta para guardar o código do Asaas. Avise o suporte Barbernegon.",
        },
        { status: 503 },
      );
    }
    const key = parsed.data.asaasApiKey.trim();
    try {
      await asaasPingApiKey(key);
    } catch (error) {
      const message =
        error instanceof AsaasApiError
          ? "Esse código do Asaas não funcionou. Confira se copiou inteiro em Integrações → API Key."
          : "Não foi possível falar com o Asaas agora. Tente de novo em instantes.";
      return NextResponse.json({ message }, { status: 400 });
    }
    data.asaasApiKeyEnc = encryptAsaasSecret(key);
    plainKeyForWebhook = key;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: "Nada para atualizar." }, { status: 400 });
  }

  const org = await prisma.organization.update({
    where: { id: auth.access.organizationId },
    data,
    select: {
      asaasEnabled: true,
      asaasAccountEmail: true,
      asaasApiKeyEnc: true,
    },
  });

  if (plainKeyForWebhook) {
    const webhookUrl = getAsaasWebhookUrl();
    const authToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
    if (!webhookUrl || !authToken) {
      webhookNote =
        "Código salvo. Falta o suporte Barbernegon liberar o aviso automático de pagamentos (URL do site / token).";
    } else {
      try {
        const result = await asaasEnsureOrgWebhook(plainKeyForWebhook, {
          url: webhookUrl,
          authToken,
          email: org.asaasAccountEmail,
        });
        webhookNote = result.created
          ? "Pronto: avisos de pagamento ligados automaticamente."
          : "Pronto: avisos de pagamento atualizados.";
      } catch (error) {
        console.error("[payments] asaasEnsureOrgWebhook", error);
        webhookNote =
          "Código salvo, mas não conseguimos ligar o aviso automático. Abra o Asaas → Integrações → Webhooks e peça ajuda ao suporte.";
      }
    }
  }

  return NextResponse.json({
    message: webhookNote
      ? `Conta ligada. ${webhookNote}`
      : "Configuração de pagamentos salva.",
    connection: {
      asaasEnabled: org.asaasEnabled,
      asaasAccountEmail: org.asaasAccountEmail,
      hasApiKey: Boolean(org.asaasApiKeyEnc),
    },
  });
}
