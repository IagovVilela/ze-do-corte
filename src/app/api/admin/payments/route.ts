import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { AsaasApiError, asaasPingApiKey } from "@/lib/asaas-client";
import {
  encryptAsaasSecret,
  isAsaasTokenEncryptionConfigured,
} from "@/lib/asaas-crypto";
import { prisma } from "@/lib/prisma";

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

  return NextResponse.json({
    platform: {
      encryptionConfigured: isAsaasTokenEncryptionConfigured(),
      webhookHint:
        "https://SEU_DOMINIO/api/webhooks/asaas (mesmo ASAAS_WEBHOOK_TOKEN no painel Asaas do salão)",
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

  if (parsed.data.asaasApiKey?.trim()) {
    if (!isAsaasTokenEncryptionConfigured()) {
      return NextResponse.json(
        {
          message:
            "Defina ASAAS_TOKEN_ENCRYPTION_KEY no servidor antes de gravar a API key.",
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
          ? `API key inválida ou Asaas indisponível: ${error.message}`
          : "Não foi possível validar a API key no Asaas.";
      return NextResponse.json({ message }, { status: 400 });
    }
    data.asaasApiKeyEnc = encryptAsaasSecret(key);
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

  return NextResponse.json({
    message: "Pagamentos do salão atualizados.",
    connection: {
      asaasEnabled: org.asaasEnabled,
      asaasAccountEmail: org.asaasAccountEmail,
      hasApiKey: Boolean(org.asaasApiKeyEnc),
    },
  });
}
