import { NextResponse } from "next/server";

import { verifyAsaasWebhookToken } from "@/lib/asaas-client";
import { processAsaasWebhook } from "@/lib/asaas-webhook";

export const dynamic = "force-dynamic";

/**
 * Webhook único Asaas (conta plataforma + contas dos salões).
 * Configure o mesmo ASAAS_WEBHOOK_TOKEN no painel Asaas (header asaas-access-token).
 */
export async function POST(request: Request) {
  const token =
    request.headers.get("asaas-access-token") ??
    request.headers.get("Asaas-Access-Token");
  if (!verifyAsaasWebhookToken(token)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  try {
    const result = await processAsaasWebhook(
      body as Parameters<typeof processAsaasWebhook>[0],
    );
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: 400 });
    }
    return NextResponse.json({ received: true, duplicate: result.duplicate ?? false });
  } catch (error) {
    console.error("POST /api/webhooks/asaas", error);
    return NextResponse.json({ message: "Erro ao processar webhook." }, { status: 500 });
  }
}
