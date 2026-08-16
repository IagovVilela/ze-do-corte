import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformApiAuth } from "@/lib/platform-auth";
import { hashPassword } from "@/lib/password";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { staffEmailSchema } from "@/lib/staff-email";
import {
  createConsultant,
  ensureSupportConsultantOrg,
  listConsultants,
} from "@/lib/support-consultant";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  email: staffEmailSchema,
  displayName: z.string().trim().min(2).max(120),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
});

export async function GET() {
  const auth = await requirePlatformApiAuth();
  if (!auth.ok) return auth.response;

  const org = await ensureSupportConsultantOrg();
  try {
    const consultants = await listConsultants(org.id);
    return NextResponse.json({ consultants });
  } catch (error) {
    console.error("GET /api/plataforma/consultores", error);
    return NextResponse.json(
      {
        consultants: [],
        message:
          "Não foi possível listar consultores. Confira se as migrações rodaram.",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requirePlatformApiAuth();
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
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const taken = await prisma.staffMember.findUnique({
    where: { email },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json({ message: "E-mail já em uso." }, { status: 409 });
  }

  const org = await ensureSupportConsultantOrg();
  try {
    const consultant = await createConsultant({
      organizationId: org.id,
      email,
      displayName: parsed.data.displayName,
      passwordHash: await hashPassword(parsed.data.password),
    });
    return NextResponse.json({ consultant }, { status: 201 });
  } catch (error) {
    console.error("POST /api/plataforma/consultores", error);
    return NextResponse.json(
      { message: "Não foi possível criar o consultor." },
      { status: 500 },
    );
  }
}
