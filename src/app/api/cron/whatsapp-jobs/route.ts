import { NextResponse } from "next/server";

import { runWhatsAppReminders } from "@/lib/whatsapp-reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization")?.trim() || "";
  if (header === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

/**
 * Cron HTTP: lembretes WhatsApp (~24h e ~2h).
 * Railway Cron Job: GET/POST https://SEU_DOMINIO/api/cron/whatsapp-jobs
 * Header: Authorization: Bearer $CRON_SECRET
 */
async function handle(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await runWhatsAppReminders();
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    console.error("[cron/whatsapp-jobs]", err);
    return NextResponse.json(
      { ok: false, message: "Falha ao rodar lembretes." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
