import { NextResponse } from "next/server";

import { formatBrPhoneNational } from "@/lib/br-phone-format";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Histórico de serviços do cliente (público, por telefone + slug).
 * Usado nas sugestões inteligentes do formulário de agendamento.
 */
export async function GET(request: Request) {
  const ip = clientIpFromRequest(request);
  const rl = checkRateLimit(`client-history:ip:${ip}`, {
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(rateLimitResponse(rl.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec) },
    });
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get("organizationSlug")?.trim().toLowerCase();
  const phoneRaw = url.searchParams.get("phone")?.trim() ?? "";
  const unitId = url.searchParams.get("unitId")?.trim() || null;

  if (!slug || phoneRaw.length < 8) {
    return NextResponse.json(
      { message: "Informe organizationSlug e phone." },
      { status: 400 },
    );
  }

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!org) {
    return NextResponse.json({ message: "Barbearia não encontrada." }, { status: 404 });
  }

  const phone = formatBrPhoneNational(phoneRaw);

  const rows = await prisma.appointment.findMany({
    where: {
      clientPhone: phone,
      status: { in: ["COMPLETED", "CONFIRMED"] },
      unit: { organizationId: org.id },
      ...(unitId ? { unitId } : {}),
    },
    orderBy: { startsAt: "desc" },
    take: 40,
    select: {
      startsAt: true,
      serviceId: true,
      service: { select: { id: true, name: true, isActive: true } },
      items: {
        select: {
          serviceId: true,
          service: { select: { id: true, name: true, isActive: true } },
        },
      },
    },
  });

  const byService = new Map<
    string,
    { serviceId: string; name: string; lastAt: string; count: number }
  >();

  for (const row of rows) {
    const list =
      row.items.length > 0
        ? row.items.map((i) => i.service)
        : [row.service];
    for (const s of list) {
      if (!s.isActive) continue;
      const cur = byService.get(s.id);
      if (!cur) {
        byService.set(s.id, {
          serviceId: s.id,
          name: s.name,
          lastAt: row.startsAt.toISOString(),
          count: 1,
        });
      } else {
        cur.count += 1;
      }
    }
  }

  const suggestions = [...byService.values()]
    .sort(
      (a, b) =>
        new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
    )
    .slice(0, 8);

  return NextResponse.json({ suggestions });
}
