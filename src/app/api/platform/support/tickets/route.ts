import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformApiAuth } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";
import { SUPPORT_TICKET_CATEGORY_LABEL } from "@/lib/support";

export const dynamic = "force-dynamic";

const listSchema = z.object({
  status: z
    .enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "ALL"])
    .optional()
    .default("ALL"),
});

export async function GET(request: Request) {
  const auth = await requirePlatformApiAuth();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsed = listSchema.safeParse({
    status: url.searchParams.get("status") ?? "ALL",
  });
  const status = parsed.success ? parsed.data.status : "ALL";

  try {
    const tickets = await prisma.supportTicket.findMany({
      where: status === "ALL" ? undefined : { status },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        subject: true,
        category: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        organization: { select: { id: true, name: true, slug: true } },
        createdByStaff: {
          select: { displayName: true, email: true },
        },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({
      tickets,
      categories: SUPPORT_TICKET_CATEGORY_LABEL,
    });
  } catch (error) {
    console.error("GET /api/platform/support/tickets", error);
    return NextResponse.json(
      {
        message:
          "Não foi possível carregar os chamados. Confira se as migrações do banco já rodaram.",
        tickets: [],
      },
      { status: 503 },
    );
  }
}
