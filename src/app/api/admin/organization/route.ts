import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { isReservedSlug, slugifyOrgName } from "@/lib/organization";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  logoUrl: z.string().trim().url().nullable().optional().or(z.literal("")),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional()
    .or(z.literal("")),
  slogan: z.string().trim().max(160).nullable().optional(),
  sloganSecondary: z.string().trim().max(200).nullable().optional(),
  heroMediaUrl: z.string().trim().url().nullable().optional().or(z.literal("")),
  aboutText: z.string().trim().max(4000).nullable().optional(),
  instagramHref: z.string().trim().url().nullable().optional().or(z.literal("")),
  whatsappHref: z.string().trim().max(300).nullable().optional().or(z.literal("")),
  phoneLabel: z.string().trim().max(40).nullable().optional(),
  timezone: z.string().trim().min(3).max(64).optional(),
  onboardingJson: z.record(z.string(), z.boolean()).optional(),
});

function emptyToNull(v: string | null | undefined) {
  if (v === undefined) return undefined;
  if (v === null || v.trim() === "") return null;
  return v.trim();
}

export async function GET() {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;

  const org = await prisma.organization.findUnique({
    where: { id: auth.access.organizationId },
  });
  if (!org) {
    return NextResponse.json({ message: "Organização não encontrada." }, { status: 404 });
  }
  return NextResponse.json({ organization: org });
}

export async function PATCH(request: Request) {
  const auth = await requireStaffApiAuth();
  if (!auth.ok) return auth.response;
  if (!auth.access.permissions.manageBranding) {
    return NextResponse.json(
      { message: "Sem permissão para editar a marca." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  if (data.slug) {
    const slug = data.slug.toLowerCase();
    if (isReservedSlug(slug)) {
      return NextResponse.json(
        { message: "Slug reservado. Escolha outro." },
        { status: 400 },
      );
    }
    const taken = await prisma.organization.findFirst({
      where: { slug, NOT: { id: auth.access.organizationId } },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json({ message: "Slug já em uso." }, { status: 409 });
    }
  }

  const org = await prisma.organization.update({
    where: { id: auth.access.organizationId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.slug !== undefined ? { slug: data.slug.toLowerCase() } : {}),
      ...(data.logoUrl !== undefined ? { logoUrl: emptyToNull(data.logoUrl) } : {}),
      ...(data.primaryColor !== undefined
        ? { primaryColor: emptyToNull(data.primaryColor) }
        : {}),
      ...(data.slogan !== undefined ? { slogan: emptyToNull(data.slogan) } : {}),
      ...(data.sloganSecondary !== undefined
        ? { sloganSecondary: emptyToNull(data.sloganSecondary) }
        : {}),
      ...(data.heroMediaUrl !== undefined
        ? { heroMediaUrl: emptyToNull(data.heroMediaUrl) }
        : {}),
      ...(data.aboutText !== undefined ? { aboutText: emptyToNull(data.aboutText) } : {}),
      ...(data.instagramHref !== undefined
        ? { instagramHref: emptyToNull(data.instagramHref) }
        : {}),
      ...(data.whatsappHref !== undefined
        ? { whatsappHref: emptyToNull(data.whatsappHref) }
        : {}),
      ...(data.phoneLabel !== undefined ? { phoneLabel: emptyToNull(data.phoneLabel) } : {}),
      ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
      ...(data.onboardingJson !== undefined ? { onboardingJson: data.onboardingJson } : {}),
    },
  });

  return NextResponse.json({ organization: org });
}

/** Utilitário exportado para testes/scripts — evita dead import warnings. */
export function suggestSlug(name: string) {
  return slugifyOrgName(name);
}
