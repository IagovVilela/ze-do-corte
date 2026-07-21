import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { SUPPORT_TICKET_CATEGORY_LABEL } from "@/lib/support";
import { notifyPlatformNewSupportTicket } from "@/lib/support-notify-platform";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  category: z.enum([
    "WHATSAPP",
    "PAYMENTS",
    "CLUB",
    "SITE",
    "BILLING",
    "OTHER",
  ]),
  body: z.string().trim().min(5).max(5000),
});

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { organizationId: auth.access.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        subject: true,
        category: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({
      tickets,
      categories: SUPPORT_TICKET_CATEGORY_LABEL,
    });
  } catch (error) {
    console.error("GET /api/admin/support/tickets", error);
    return NextResponse.json(
      {
        message:
          "Não foi possível carregar os chamados. Se acabou de atualizar o sistema, rode as migrações do banco.",
        tickets: [],
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Dados inválidos. Confira assunto, categoria e mensagem." },
      { status: 400 },
    );
  }

  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        organizationId: auth.access.organizationId,
        createdByStaffId: auth.access.userId,
        subject: parsed.data.subject,
        category: parsed.data.category,
        status: "OPEN",
        messages: {
          create: {
            body: parsed.data.body,
            authorKind: "STAFF",
            authorStaffId: auth.access.userId,
          },
        },
      },
      select: {
        id: true,
        subject: true,
        category: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        organization: { select: { name: true, slug: true } },
      },
    });

    void notifyPlatformNewSupportTicket({
      ticketId: ticket.id,
      subject: ticket.subject,
      category: ticket.category,
      organizationName: ticket.organization.name,
      organizationSlug: ticket.organization.slug,
      staffName:
        auth.access.displayName?.trim() || auth.access.email || "Equipe",
      bodyPreview: parsed.data.body,
    });

    return NextResponse.json(
      { ticket, message: "Chamado aberto. Acompanhe em Meus chamados." },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/admin/support/tickets", error);
    return NextResponse.json(
      {
        message:
          "Não foi possível abrir o chamado. Confira se as migrações do banco já rodaram.",
      },
      { status: 503 },
    );
  }
}
