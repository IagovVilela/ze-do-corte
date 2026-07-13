import "server-only";

import type { Prisma, StaffMember, StaffRole } from "@prisma/client";

export type StaffPermissions = {
  manageUnits: boolean;
  manageStaff: "none" | "staff_only" | "full";
  manageServices: boolean;
  manageSettings: boolean;
  exportData: boolean;
  viewRevenue: boolean;
  manageSubscriptions: boolean;
  manageBranding: boolean;
};

export type StaffAccess = {
  userId: string;
  email: string | undefined;
  displayName: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  role: StaffRole;
  organizationId: string;
  /**
   * Quando definido, métricas e listagens ficam restritas a estas unidades.
   * Proprietário / admin sem unidade = visão da organização inteira.
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
        manageSubscriptions: true,
        manageBranding: true,
      };
    case "ADMIN":
      return {
        manageUnits: true,
        manageStaff: "staff_only",
        manageServices: true,
        manageSettings: false,
        exportData: true,
        viewRevenue: true,
        manageSubscriptions: true,
        manageBranding: false,
      };
    case "STAFF":
      return {
        manageUnits: false,
        manageStaff: "none",
        manageServices: false,
        manageSettings: false,
        exportData: false,
        viewRevenue: false,
        manageSubscriptions: false,
        manageBranding: false,
      };
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export function staffAccessFromMember(member: StaffMember): StaffAccess | null {
  if (!member.organizationId) return null;
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
    organizationId: member.organizationId,
    unitIdsFilter:
      unitIdsFilter && unitIdsFilter.length > 0 ? unitIdsFilter : undefined,
    permissions: permissionsForRole(member.role),
  };
}

/**
 * Filtro de agendamentos no painel e exportações — sempre limitado à organização.
 */
export function appointmentScopeWhere(
  access: StaffAccess,
): Prisma.AppointmentWhereInput {
  const orgViaUnit: Prisma.AppointmentWhereInput = {
    unit: { organizationId: access.organizationId },
  };

  if (access.role === "STAFF") {
    const unitIds = access.unitIdsFilter;
    if (!unitIds?.length) {
      return { id: { in: [] } };
    }
    return {
      AND: [
        orgViaUnit,
        { unitId: { in: unitIds } },
        { staffMemberId: access.userId },
      ],
    };
  }

  if (access.role === "OWNER" || access.role === "ADMIN") {
    return orgViaUnit;
  }

  if (access.unitIdsFilter?.length) {
    return {
      AND: [orgViaUnit, { unitId: { in: access.unitIdsFilter } }],
    };
  }
  return orgViaUnit;
}

export function unitScopeWhere(
  access: StaffAccess,
): Prisma.BarbershopUnitWhereInput {
  return { organizationId: access.organizationId };
}

export function staffMemberScopeWhere(
  access: StaffAccess,
): Prisma.StaffMemberWhereInput {
  return { organizationId: access.organizationId };
}

export function serviceScopeWhere(
  access: StaffAccess,
): Prisma.ServiceWhereInput {
  return { unit: { organizationId: access.organizationId } };
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
  target: { role: StaffRole; organizationId: string },
): boolean {
  if (target.organizationId !== access.organizationId) return false;
  if (access.permissions.manageStaff === "none") return false;
  if (access.permissions.manageStaff === "full") return true;
  return target.role === "STAFF";
}
