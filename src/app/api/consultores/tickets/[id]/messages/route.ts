import { NextResponse } from "next/server";
import { z } from "zod";

import { requireConsultantApiAuth } from "@/lib/consultant-auth";
import { prisma } from "@/lib/prisma";
import { logSupportAccess } from "@/lib/support-consultant";

export const dynamic = "force-dynamic";

const messageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireConsultantApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const existing = await prisma.supportTicket.findUnique({
    where: { id },
    select: { id: true, status: true, organizationId: true },
  });
  if (!existing) {
    return NextResponse.json({ message: "Chamado não encontrado." }, { status: 404 });
  }
  if (existing.status === "CLOSED") {
    return NextResponse.json(
      { message: "Este chamado está fechado." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Mensagem inválida." }, { status: 400 });
  }

  const [message] = await prisma.$transaction([
    prisma.supportTicketMessage.create({
      data: {
        ticketId: existing.id,
        body: parsed.data.body,
        authorKind: "PLATFORM",
        authorEmail: auth.access.email,
        authorStaffId: auth.access.userId,
      },
      select: {
        id: true,
        body: true,
        authorKind: true,
        authorEmail: true,
        createdAt: true,
      },
    }),
    prisma.supportTicket.update({
      where: { id: existing.id },
      data: {
        status: existing.status === "OPEN" ? "IN_PROGRESS" : existing.status,
        updatedAt: new Date(),
      },
    }),
  ]);

  await logSupportAccess({
    consultantStaffId: auth.access.userId,
    organizationId: existing.organizationId,
    ticketId: existing.id,
    action: "REPLY",
  });

  return NextResponse.json({ message, ok: true }, { status: 201 });
}
