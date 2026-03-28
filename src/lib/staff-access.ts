import "server-only";

import type { Prisma, StaffMember, StaffRole } from "@prisma/client";

export type StaffPermissions = {
  manageUnits: boolean;
  /** Quem pode gerir contas no painel (registros StaffMember + senhas). */
  manageStaff: "none" | "staff_only" | "full";
  manageServices: boolean;
  manageSettings: boolean;
  exportData: boolean;
  viewRevenue: boolean;
};

export type StaffAccess = {
  userId: string;
  email: string | undefined;
  displayName: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  role: StaffRole;
  /**
   * Quando definido, métricas e listagens ficam restritas a estas unidades.
   * Proprietário / admin sem unidade = visão global.
   */
  unitIdsFilter: string[] | undefined;
  permissions: StaffPermissions;
};

function permissionsForRole(role: StaffRole): StaffPermissions {
  switch (role) {
    case "OWNER":
      return {
        manageUnits: true,
        manageStaff: "full",
        manageServices: true,
        manageSettings: true,
        exportData: true,
        viewRevenue: true,
      };
    case "ADMIN":
      return {
        manageUnits: true,
        manageStaff: "staff_only",
        manageServices: true,
        manageSettings: false,
        exportData: true,
        viewRevenue: true,
      };
    case "STAFF":
      return {
        manageUnits: false,
        manageStaff: "none",
        manageServices: false,
        manageSettings: false,
        exportData: false,
        viewRevenue: false,
      };
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

/** Monta `StaffAccess` a partir de um registro `StaffMember` autenticado. */
export function staffAccessFromMember(member: StaffMember): StaffAccess | null {
  if (member.role === "STAFF" && !member.unitId) {
    return null;
  }
  const unitIdsFilter =
    member.role === "STAFF" ? (member.unitId ? [member.unitId] : []) : undefined;
  return {
    userId: member.id,
    email: member.email,
    displayName: member.displayName ?? null,
    phone: member.phone ?? null,
    profileImageUrl: member.profileImageUrl ?? null,
    role: member.role,
    unitIdsFilter:
      unitIdsFilter && unitIdsFilter.length > 0 ? unitIdsFilter : undefined,
    permissions: permissionsForRole(member.role),
  };
}

/**
 * Filtro de agendamentos no painel e exportações.
 * - OWNER / ADMIN: **sempre** todos os agendamentos (todas as unidades, inclusive `unitId` null).
 * - STAFF: só da sua unidade **e** com `staffMemberId` = próprio id (produção atribuída).
 *   Agendamentos sem profissional só aparecem para dono/admin até serem atribuídos.
 */
export function appointmentScopeWhere(
  access: StaffAccess,
): Prisma.AppointmentWhereInput {
  if (access.role === "STAFF") {
    const unitIds = access.unitIdsFilter;
    if (!unitIds?.length) {
      return { id: { in: [] } };
    }
    return {
      AND: [{ unitId: { in: unitIds } }, { staffMemberId: access.userId }],
    };
  }
  if (access.role === "OWNER" || access.role === "ADMIN") {
    return {};
  }
  if (access.unitIdsFilter?.length) {
    return { unitId: { in: access.unitIdsFilter } };
  }
  return {};
}

export function canAssignRole(
  access: StaffAccess,
  targetRole: StaffRole,
): boolean {
  if (access.permissions.manageStaff === "none") return false;
  if (access.permissions.manageStaff === "full") return true;
  return targetRole === "STAFF";
}

export function canModifyStaffMember(
  access: StaffAccess,
  target: { role: StaffRole; email: string },
): boolean {
  if (access.permissions.manageStaff === "none") return false;
  if (target.email.toLowerCase() === access.email?.toLowerCase()) {
    return false;
  }
  if (access.permissions.manageStaff === "full") return true;
  return target.role === "STAFF";
}
