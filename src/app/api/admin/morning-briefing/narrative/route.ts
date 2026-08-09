import { NextResponse } from "next/server";
import { z } from "zod";

import { getStaffAccessOrNull } from "@/lib/admin-auth";
import {
  getAdminMorningBriefing,
  type MorningBriefingFacts,
} from "@/lib/admin-morning-briefing";
import {
  generateMorningNarrative,
  isMorningBriefingAiEnabled,
} from "@/lib/morning-briefing-ai";
import {
  checkRateLimit,
  clientIpFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const factsSchema = z.object({
  generatedAt: z.string().min(1),
  organizationId: z.string().min(1),
  timezone: z.string().min(1),
  kpis: z.object({
    todayConfirmed: z.number(),
    nextTwoHours: z.number(),
    unpaidCount: z.number(),
    unpaidTotal: z.number(),
    clubPastDue: z.number(),
    lostClients: z.number(),
    atRiskClients: z.number(),
    lowStockCount: z.number(),
    receivedLast7d: z.number(),
    receivedPrev7d: z.number(),
    receivedDeltaPercent: z.number().nullable(),
  }),
  clubBuckets: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      count: z.number(),
    }),
  ),
  topClientHint: z.string().nullable(),
});

/**
 * POST: gera narrativa do briefing (LLM se MORNING_BRIEFING_AI_ENABLED + OPENAI_API_KEY;
 * senão fallback por regras). Cache diário por organização.
 */
export async function POST(request: Request) {
  const access = await getStaffAccessOrNull();
  if (!access) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }
  if (access.role !== "OWNER" && access.role !== "ADMIN") {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const ip = clientIpFromRequest(request);
  const limited = checkRateLimit(`morning-ai:${access.organizationId}:${ip}`, {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsedBody = z
    .object({
      facts: factsSchema.optional(),
      forceRefresh: z.boolean().optional(),
    })
    .safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  let facts: MorningBriefingFacts | null = parsedBody.data.facts ?? null;
  if (facts && facts.organizationId !== access.organizationId) {
    return NextResponse.json({ message: "Facts inválidos." }, { status: 403 });
  }

  if (!facts) {
    const briefing = await getAdminMorningBriefing(access);
    if (!briefing) {
      return NextResponse.json(
        { message: "Briefing indisponível." },
        { status: 404 },
      );
    }
    facts = briefing.facts;
  }

  const narrative = await generateMorningNarrative(facts, {
    forceRefresh: parsedBody.data.forceRefresh === true,
  });

  return NextResponse.json({
    narrative,
    aiConfigured: isMorningBriefingAiEnabled(),
  });
}

export async function GET() {
  const access = await getStaffAccessOrNull();
  if (!access) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }
  return NextResponse.json({
    aiConfigured: isMorningBriefingAiEnabled(),
  });
}
