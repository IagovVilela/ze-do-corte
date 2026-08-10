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
  answerRightHandChat,
  isRightHandChatAiEnabled,
} from "@/lib/right-hand-chat-ai";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  question: z.string().trim().min(3).max(500),
  chartRange: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      }),
    )
    .max(8)
    .optional(),
});

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
    `right-hand-chat:${access.organizationId}:${ip}`,
    { limit: 20, windowMs: 60 * 60 * 1000 },
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
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  const range = parseDashboardRange(parsed.data.chartRange);
  const snapshot = await getRightHandSnapshot(access, range);
  if (!snapshot) {
    return NextResponse.json({ message: "Indisponível." }, { status: 404 });
  }

  const result = await answerRightHandChat({
    question: parsed.data.question,
    facts: snapshot.facts,
    history: parsed.data.history,
  });

  return NextResponse.json({
    ...result,
    aiConfigured: isRightHandChatAiEnabled(),
  });
}
