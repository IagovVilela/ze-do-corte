import type { PrismaClient, StaffRole } from "@prisma/client";

import { DEMO_ORG_SLUG } from "@/lib/demo-vitrine";
import { hashPassword } from "@/lib/password";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

/** Contas de demonstração da org Barbergon (seed + ensure-owner em prod). */
export const DEMO_ADMIN_EMAIL = "gerente@zdc.local";
export const DEMO_STAFF_EMAIL = "barbeiro@zdc.local";
export const DEMO_STAFF_DEFAULT_PASSWORD = "AlterarSenha123!";

type DemoMember = {
  email: string;
  displayName: string;
  role: StaffRole;
  /** STAFF precisa de unidade; ADMIN/OWNER podem ficar sem. */
  needsUnit: boolean;
  showOnWebsite: boolean;
  websiteBio?: string;
};

const DEMO_MEMBERS: DemoMember[] = [
  {
    email: DEMO_ADMIN_EMAIL,
    displayName: "Gerente (demo)",
    role: "ADMIN",
    needsUnit: false,
    showOnWebsite: false,
  },
  {
    email: DEMO_STAFF_EMAIL,
    displayName: "Barbeiro (demo)",
    role: "STAFF",
    needsUnit: true,
    showOnWebsite: true,
    websiteBio: "Barbeiro de demonstração — use esta conta para mostrar o painel do profissional.",
  },
];

function resolveDemoPassword(): string | null {
  const raw =
    process.env.SEED_DEMO_PASSWORD?.trim() ||
    process.env.SEED_OWNER_PASSWORD?.trim() ||
    DEMO_STAFF_DEFAULT_PASSWORD;
  if (raw.length < MIN_PASSWORD_LENGTH) return null;
  return raw;
}

/**
 * Garante ADMIN + STAFF de demo na org padrão (slug ze-do-corte / Barbergon).
 * Idempotente: cria ou atualiza papel/unidade/senha (senha sempre alinhada ao env de demo
 * para a apresentação a clientes continuar previsível).
 */
export async function ensureDemoStaffWithPrisma(
  prisma: PrismaClient,
): Promise<void> {
  const password = resolveDemoPassword();
  if (!password) {
    console.error(
      `[ensure-demo-staff] SEED_DEMO_PASSWORD / SEED_OWNER_PASSWORD deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    );
    return;
  }

  const org = await prisma.organization.findUnique({
    where: { slug: DEMO_ORG_SLUG },
    select: { id: true },
  });
  if (!org) {
    console.warn(
      `[ensure-demo-staff] Org ${DEMO_ORG_SLUG} ainda não existe — rode ensure-owner ou o seed completo antes.`,
    );
    return;
  }

  const unit = await prisma.barbershopUnit.upsert({
    where: {
      organizationId_slug: { organizationId: org.id, slug: "matriz" },
    },
    create: {
      organizationId: org.id,
      name: "Unidade matriz",
      slug: "matriz",
      isDefault: true,
      isActive: true,
      city: "São José dos Campos",
    },
    update: {
      isDefault: true,
      isActive: true,
    },
  });

  const passwordHash = await hashPassword(password);

  for (const member of DEMO_MEMBERS) {
    const email = member.email.toLowerCase();
    const existing = await prisma.staffMember.findUnique({
      where: { email },
    });

    const data = {
      organizationId: org.id,
      displayName: member.displayName,
      role: member.role,
      passwordHash,
      unitId: member.needsUnit ? unit.id : null,
      showOnWebsite: member.showOnWebsite,
      websiteBio: member.websiteBio ?? null,
    };

    if (!existing) {
      await prisma.staffMember.create({
        data: {
          email,
          ...data,
        },
      });
      console.log(
        `[ensure-demo-staff] Criado ${member.role}: ${email}`,
      );
      continue;
    }

    await prisma.staffMember.update({
      where: { email },
      data,
    });
    console.log(
      `[ensure-demo-staff] Atualizado ${member.role}: ${email}`,
    );
  }
}
