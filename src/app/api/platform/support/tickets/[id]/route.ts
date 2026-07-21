import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformApiAuth } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requirePlatformApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      category: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      organization: { select: { id: true, name: true, slug: true } },
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

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requirePlatformApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Status inválido." }, { status: 400 });
  }

  const existing = await prisma.supportTicket.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ message: "Chamado não encontrado." }, { status: 404 });
  }

  const status = parsed.data.status;
  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: {
      status,
      resolvedAt:
        status === "RESOLVED" || status === "CLOSED" ? new Date() : null,
    },
    select: {
      id: true,
      status: true,
      resolvedAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ticket });
}
