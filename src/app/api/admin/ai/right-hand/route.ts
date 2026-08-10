import { NextResponse } from "next/server";
import { z } from "zod";

import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { getRightHandSnapshot } from "@/lib/admin-right-hand";
import { parseDashboardRange } from "@/lib/dashboard-period";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  generateRightHandNarrative,
  isRightHandAiEnabled,
} from "@/lib/right-hand-ai";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  chartRange: z.string().optional(),
  forceRefresh: z.boolean().optional(),
});

/**
 * POST: análise narrativa do Braço Direito (1 urgente + oportunidades).
 */
export async function POST(request: Request) {
  const access = await getStaffAccessOrNull();
  if (!access) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }
  if (access.role !== "OWNER" && access.role !== "ADMIN") {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }
  if (!access.permissions.viewRevenue) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const ip = clientIpFromRequest(request);
  const limited = checkRateLimit(
    `right-hand-ai:${access.organizationId}:${ip}`,
    { limit: 30, windowMs: 60 * 60 * 1000 },
  );
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }

  let raw: unknown = {};
  try {
    raw = await request.json();
  } catch {
    raw = {};
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  const range = parseDashboardRange(parsed.data.chartRange);
  const snapshot = await getRightHandSnapshot(access, range, {
    forceRefresh: parsed.data.forceRefresh === true,
  });
  if (!snapshot) {
    return NextResponse.json({ message: "Indisponível." }, { status: 404 });
  }

  const narrative = await generateRightHandNarrative(snapshot.facts, {
    forceRefresh: parsed.data.forceRefresh === true,
  });

  return NextResponse.json({
    narrative,
    facts: snapshot.facts,
    aiConfigured: isRightHandAiEnabled(),
  });
}

export async function GET() {
  const access = await getStaffAccessOrNull();
  if (!access) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }
  return NextResponse.json({ aiConfigured: isRightHandAiEnabled() });
}
