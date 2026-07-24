import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { phoneToWhatsAppHref } from "@/lib/phone-to-whatsapp-link";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  phone: z.string().trim().min(8, "Informe o WhatsApp.").max(32),
  shopName: z.string().trim().min(2, "Informe o nome da barbearia.").max(120),
  city: z.string().trim().max(80).optional().nullable(),
  email: z
    .union([
      z.literal(""),
      z.string().trim().email("E-mail inválido.").max(160),
    ])
    .optional()
    .nullable(),
  note: z.string().trim().max(400).optional().nullable(),
  /** Honeypot — deve ficar vazio. */
  website: z.string().max(200).optional().nullable(),
});

export async function POST(request: Request) {
  const ip = clientIpFromRequest(request);
  const rl = checkRateLimit(`leads:ip:${ip}`, {
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(rateLimitResponse(rl.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec) },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  if (parsed.data.website?.trim()) {
    return NextResponse.json({ ok: true });
  }

  if (!phoneToWhatsAppHref(parsed.data.phone)) {
    return NextResponse.json(
      { message: "WhatsApp inválido. Use DDD + número (ex.: 12999999999)." },
      { status: 400 },
    );
  }

  const email =
    parsed.data.email && parsed.data.email.trim().length > 0
      ? parsed.data.email.trim().toLowerCase()
      : null;
  const city = parsed.data.city?.trim() || null;
  const note = parsed.data.note?.trim() || null;

  try {
    const lead = await prisma.platformLead.create({
      data: {
        name: parsed.data.name.trim(),
        phone: parsed.data.phone.trim(),
        email,
        shopName: parsed.data.shopName.trim(),
        city,
        note,
        source: "lista-espera",
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/leads", error);
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code === "P2021" || code === "P2010") {
      return NextResponse.json(
        {
          message:
            "Tabela de leads ainda não existe no banco. Rode a migração (prisma migrate deploy) e tente de novo.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { message: "Não foi possível salvar. Tente de novo em instantes." },
      { status: 500 },
    );
  }
}
