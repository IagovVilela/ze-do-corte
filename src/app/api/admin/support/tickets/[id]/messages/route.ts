import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const messageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, organizationId: auth.access.organizationId },
    select: {
      id: true,
      subject: true,
      category: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      createdByStaff: {
        select: { displayName: true, email: true },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          authorKind: true,
          authorEmail: true,
          createdAt: true,
          authorStaff: {
            select: { displayName: true, email: true },
          },
        },
      },
    },
  });

  if (!ticket) {
    return NextResponse.json({ message: "Chamado não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ticket });
}

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const existing = await prisma.supportTicket.findFirst({
    where: { id, organizationId: auth.access.organizationId },
    select: { id: true, status: true },
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
        authorKind: "STAFF",
        authorStaffId: auth.access.userId,
      },
      select: {
        id: true,
        body: true,
        authorKind: true,
        createdAt: true,
      },
    }),
    prisma.supportTicket.update({
      where: { id: existing.id },
      data: {
        updatedAt: new Date(),
        status:
          existing.status === "RESOLVED" ? "OPEN" : existing.status,
        resolvedAt: existing.status === "RESOLVED" ? null : undefined,
      },
    }),
  ]);

  return NextResponse.json({ message, ok: true }, { status: 201 });
}
