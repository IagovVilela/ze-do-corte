import { NextResponse } from "next/server";
import { z } from "zod";

import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { getAdminReportsSnapshot } from "@/lib/admin-reports";
import { parseDashboardRange } from "@/lib/dashboard-period";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  buildReportsPeriodFacts,
  generateReportsPeriodNarrative,
  isReportsPeriodAiEnabled,
} from "@/lib/reports-period-ai";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  chartRange: z.string().optional(),
});

/**
 * POST: leitura do período em Relatórios (IA ou regras) + 3 ações.
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
    `reports-ai:${access.organizationId}:${ip}`,
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

  const chartRange = parseDashboardRange(parsed.data.chartRange);
  const snapshot = await getAdminReportsSnapshot(access, chartRange, {});
  const facts = buildReportsPeriodFacts(snapshot, access.organizationId);
  const narrative = await generateReportsPeriodNarrative(facts);

  return NextResponse.json({
    narrative,
    facts,
    aiConfigured: isReportsPeriodAiEnabled(),
  });
}

export async function GET() {
  const access = await getStaffAccessOrNull();
  if (!access) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }
  return NextResponse.json({
    aiConfigured: isReportsPeriodAiEnabled(),
  });
}
