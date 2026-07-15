import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { requireStaffApiAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { isReservedSlug } from "@/lib/organization";
import {
  siteCanvasSchema,
  getCanvasTemplate,
  CANVAS_PAGE_TEMPLATE_IDS,
  type CanvasTemplateId,
} from "@/lib/site-canvas";

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
  siteJson: siteCanvasSchema.optional(),
  siteTemplate: z.enum(CANVAS_PAGE_TEMPLATE_IDS).optional(),
  marketplaceListed: z.boolean().optional(),
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

  let nextSiteJson = data.siteJson;
  let templatePrimary: string | undefined;
  if (data.siteTemplate) {
    const current = await prisma.organization.findUnique({
      where: { id: auth.access.organizationId },
      select: { name: true },
    });
    const built = getCanvasTemplate(
      data.siteTemplate as CanvasTemplateId,
      data.name ?? current?.name ?? "Barbearia",
    );
    const validated = siteCanvasSchema.safeParse(built);
    if (!validated.success) {
      return NextResponse.json(
        {
          message:
            "Modelo inválido (estrutura do canvas). Tente outro modelo ou atualize o app.",
          issues: validated.error.issues.slice(0, 5).map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 500 },
      );
    }
    nextSiteJson = validated.data;
    templatePrimary = nextSiteJson.theme?.primary;
  }

  let nextOnboarding: Prisma.InputJsonValue | undefined;
  if (data.onboardingJson !== undefined) {
    const current = await prisma.organization.findUnique({
      where: { id: auth.access.organizationId },
      select: { onboardingJson: true },
    });
    const prev =
      current?.onboardingJson &&
      typeof current.onboardingJson === "object" &&
      !Array.isArray(current.onboardingJson)
        ? (current.onboardingJson as Record<string, unknown>)
        : {};
    nextOnboarding = {
      ...prev,
      ...data.onboardingJson,
    } as Prisma.InputJsonValue;
  }

  const org = await prisma.organization.update({
    where: { id: auth.access.organizationId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.slug !== undefined ? { slug: data.slug.toLowerCase() } : {}),
      ...(data.logoUrl !== undefined ? { logoUrl: emptyToNull(data.logoUrl) } : {}),
      ...(data.primaryColor !== undefined
        ? { primaryColor: emptyToNull(data.primaryColor) }
        : templatePrimary
          ? { primaryColor: templatePrimary }
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
      ...(nextOnboarding !== undefined ? { onboardingJson: nextOnboarding } : {}),
      ...(nextSiteJson !== undefined
        ? { siteJson: nextSiteJson as Prisma.InputJsonValue }
        : {}),
      ...(data.marketplaceListed !== undefined
        ? { marketplaceListed: data.marketplaceListed }
        : {}),
    },
  });

  return NextResponse.json({ organization: org });
}
