import { NextResponse } from "next/server";
import { z } from "zod";

import { getStaffAccessOrNull } from "@/lib/admin-auth";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  generateWhatsAppDraft,
  isWhatsAppDraftAiEnabled,
} from "@/lib/whatsapp-draft-ai";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  kind: z.enum([
    "winback",
    "club_underuse",
    "club_past_due",
    "club_churn",
    "club_near_limit",
  ]),
  firstName: z.string().trim().min(1).max(80),
  daysSinceLastActivity: z.number().int().min(0).max(3650).nullable().optional(),
  planName: z.string().trim().max(80).nullable().optional(),
  lastServiceHint: z.string().trim().max(80).nullable().optional(),
  shopName: z.string().trim().max(80).nullable().optional(),
});

/**
 * POST: rascunho de mensagem WhatsApp (retenção / clube).
 * Sem telefone/CPF no payload — só primeiro nome e fatos agregados.
 */
export async function POST(request: Request) {
  const access = await getStaffAccessOrNull();
  if (!access) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const ip = clientIpFromRequest(request);
  const limited = checkRateLimit(
    `wa-draft:${access.organizationId}:${access.userId}:${ip}`,
    { limit: 60, windowMs: 60 * 60 * 1000 },
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
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const draft = await generateWhatsAppDraft(parsed.data);
  return NextResponse.json({
    draft,
    aiConfigured: isWhatsAppDraftAiEnabled(),
  });
}

export async function GET() {
  const access = await getStaffAccessOrNull();
  if (!access) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }
  return NextResponse.json({
    aiConfigured: isWhatsAppDraftAiEnabled(),
  });
}
