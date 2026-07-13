import { NextResponse } from "next/server";
import { z } from "zod";

import { appendSessionCookie } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/password";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { createDbSession } from "@/lib/session-cookie";
import { isReservedSlug, slugifyOrgName } from "@/lib/organization";
import { staffEmailSchema } from "@/lib/staff-email";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  shopName: z.string().trim().min(2, "Informe o nome da barbearia.").max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido (use letras minúsculas, números e hífens).")
    .optional(),
  ownerName: z.string().trim().min(2, "Informe seu nome.").max(80),
  email: staffEmailSchema,
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Senha com pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const existingEmail = await prisma.staffMember.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existingEmail) {
    return NextResponse.json(
      { message: "Já existe uma conta com este e-mail." },
      { status: 409 },
    );
  }

  let slug = (parsed.data.slug?.trim() || slugifyOrgName(parsed.data.shopName)).toLowerCase();
  if (isReservedSlug(slug)) {
    return NextResponse.json(
      { message: "Este endereço está reservado. Escolha outro slug." },
      { status: 400 },
    );
  }

  const slugTaken = await prisma.organization.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (slugTaken) {
    return NextResponse.json(
      { message: "Este endereço já está em uso. Escolha outro slug." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const onboardingJson = {
    logo: false,
    unit: true,
    service: false,
    staff: false,
    schedule: false,
  };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: parsed.data.shopName,
          slug,
          planStatus: "TRIAL",
          trialEndsAt,
          slogan: parsed.data.shopName,
          sloganSecondary: "Sua barbearia, sua cara.",
          primaryColor: "#c4a574",
          onboardingJson,
        },
      });

      const unit = await tx.barbershopUnit.create({
        data: {
          organizationId: org.id,
          name: "Unidade principal",
          slug: "matriz",
          isDefault: true,
          isActive: true,
        },
      });

      const owner = await tx.staffMember.create({
        data: {
          organizationId: org.id,
          email,
          displayName: parsed.data.ownerName,
          role: "OWNER",
          passwordHash,
          unitId: null,
        },
      });

      return { org, unit, owner };
    });

    const raw = await createDbSession(result.owner.id);
    const res = NextResponse.json({
      ok: true,
      organization: { slug: result.org.slug, name: result.org.name },
      redirect: "/admin",
    });
    appendSessionCookie(res, raw);
    return res;
  } catch (error) {
    console.error("POST /api/cadastro", error);
    return NextResponse.json(
      { message: "Não foi possível criar sua conta. Tente outro slug ou e-mail." },
      { status: 500 },
    );
  }
}
