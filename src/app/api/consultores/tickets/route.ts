import { NextResponse } from "next/server";
import { z } from "zod";

import { requireConsultantApiAuth } from "@/lib/consultant-auth";
import { prisma } from "@/lib/prisma";
import { SUPPORT_TICKET_CATEGORY_LABEL } from "@/lib/support";
import { SUPPORT_CONSULTANT_ORG_SLUG } from "@/lib/support-consultant";

export const dynamic = "force-dynamic";

const listSchema = z.object({
  status: z
    .enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "ALL"])
    .optional()
    .default("ALL"),
  q: z.string().trim().max(80).optional().default(""),
});

export async function GET(request: Request) {
  const auth = await requireConsultantApiAuth();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsed = listSchema.safeParse({
    status: url.searchParams.get("status") ?? "ALL",
    q: url.searchParams.get("q") ?? "",
  });
  const status = parsed.success ? parsed.data.status : "ALL";
  const q = parsed.success ? parsed.data.q : "";

  try {
    const tickets = await prisma.supportTicket.findMany({
      where: {
        ...(status === "ALL" ? {} : { status }),
        organization: {
          slug: { not: SUPPORT_CONSULTANT_ORG_SLUG },
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { slug: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
      },
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
    console.error("GET /api/consultores/tickets", error);
    return NextResponse.json(
      { message: "Não foi possível carregar os chamados.", tickets: [] },
      { status: 503 },
    );
  }
}
