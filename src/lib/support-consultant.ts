import "server-only";

import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const SUPPORT_CONSULTANT_ORG_SLUG = "barbernegon-suporte";
export const SUPPORT_CONSULTANT_ORG_NAME = "Barbernegon Suporte";

export function assistStaffEmail(organizationId: string): string {
  return `assist.${organizationId}@barbernegon-suporte.local`;
}

function newCuidLike(): string {
  return `c${Date.now().toString(36)}${randomBytes(10).toString("hex")}`;
}

export type ConsultantRow = {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  createdAt: Date;
};

/** Garante a organização interna onde vivem as contas SUPPORT_CONSULTANT. */
export async function ensureSupportConsultantOrg(): Promise<{ id: string }> {
  const existing = await prisma.organization.findUnique({
    where: { slug: SUPPORT_CONSULTANT_ORG_SLUG },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.organization.create({
    data: {
      name: SUPPORT_CONSULTANT_ORG_NAME,
      slug: SUPPORT_CONSULTANT_ORG_SLUG,
      planStatus: "ACTIVE",
      planTier: "PLUS",
      marketplaceListed: false,
      timezone: "America/Sao_Paulo",
      units: {
        create: {
          name: "Suporte",
          slug: "suporte",
          isDefault: true,
          isActive: true,
        },
      },
    },
    select: { id: true },
  });
}

/** SQL cru: o client Prisma em cache do Next às vezes não reconhece o enum novo. */
export async function listConsultants(
  organizationId: string,
): Promise<ConsultantRow[]> {
  return prisma.$queryRaw<ConsultantRow[]>(Prisma.sql`
    SELECT id, email, "displayName", "isActive", "createdAt"
    FROM "StaffMember"
    WHERE "organizationId" = ${organizationId}
      AND role::text = 'SUPPORT_CONSULTANT'
    ORDER BY "createdAt" DESC
  `);
}

export async function createConsultant(input: {
  organizationId: string;
  email: string;
  displayName: string;
  passwordHash: string;
}): Promise<ConsultantRow> {
  const id = newCuidLike();
  const rows = await prisma.$queryRaw<ConsultantRow[]>(Prisma.sql`
    INSERT INTO "StaffMember" (
      id, "organizationId", email, "displayName", role, "passwordHash",
      "isActive", "showOnWebsite", "createdAt", "updatedAt"
    ) VALUES (
      ${id},
      ${input.organizationId},
      ${input.email},
      ${input.displayName},
      CAST('SUPPORT_CONSULTANT' AS "StaffRole"),
      ${input.passwordHash},
      true,
      false,
      NOW(),
      NOW()
    )
    RETURNING id, email, "displayName", "isActive", "createdAt"
  `);
  const row = rows[0];
  if (!row) throw new Error("Falha ao criar consultor.");
  return row;
}

export async function findConsultantById(
  consultantId: string,
): Promise<{ id: string } | null> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM "StaffMember"
    WHERE id = ${consultantId} AND role::text = 'SUPPORT_CONSULTANT'
    LIMIT 1
  `);
  return rows[0] ?? null;
}

export async function logSupportAccess(input: {
  consultantStaffId: string;
  organizationId?: string | null;
  ticketId?: string | null;
  action: "VIEW_TICKET" | "VIEW_ORG" | "REPLY" | "ASSIST_LOGIN";
}): Promise<void> {
  try {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "SupportAccessLog" (
        id, "consultantStaffId", "organizationId", "ticketId", action, "createdAt"
      ) VALUES (
        ${newCuidLike()},
        ${input.consultantStaffId},
        ${input.organizationId ?? null},
        ${input.ticketId ?? null},
        CAST(${input.action} AS "SupportAccessAction"),
        NOW()
      )
    `);
  } catch (error) {
    console.error("logSupportAccess", error);
  }
}
