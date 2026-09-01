import "server-only";

import { prisma } from "@/lib/prisma";
import {
  computePriceGap,
  computeSellingPrice,
  computeServiceCost,
  type ServiceCostResult,
} from "@/lib/service-costing";
import { getFixedCostContext } from "@/lib/finance-settings";

export type ServiceCostRow = {
  serviceId: string;
  serviceName: string;
  unitId: string;
  unitName: string;
  currentPrice: number;
  durationMinutes: number;
  directLaborCost: number;
  materialCost: number;
  cost: ServiceCostResult;
  suggestedPrice: number;
  variablePercent: number;
  profitPercent: number;
  gap: number;
  belowCost: boolean;
  hasProfile: boolean;
};

export async function listServiceCostRows(
  organizationId: string,
  options?: { unitId?: string; variablePercent?: number; profitPercent?: number },
): Promise<{
  rows: ServiceCostRow[];
  fixedCostPerHour: number;
  settings: {
    defaultVariableExpensePercent: number;
    defaultProfitMarginPercent: number;
  };
}> {
  const ctx = await getFixedCostContext(organizationId);
  const variablePercent =
    options?.variablePercent ?? ctx.settings.defaultVariableExpensePercent;
  const profitPercent =
    options?.profitPercent ?? ctx.settings.defaultProfitMarginPercent;

  const services = await prisma.service.findMany({
    where: {
      isActive: true,
      unit: { organizationId },
      ...(options?.unitId ? { unitId: options.unitId } : {}),
    },
    include: {
      unit: { select: { id: true, name: true } },
      costProfile: true,
    },
    orderBy: [{ unit: { name: "asc" } }, { name: "asc" }],
  });

  const rows: ServiceCostRow[] = services.map((s) => {
    const profile = s.costProfile;
    const durationMinutes =
      profile?.durationMinutesOverride ?? s.durationMinutes;
    const directLaborCost = profile ? Number(profile.directLaborCost) : 0;
    const materialCost = profile ? Number(profile.materialCost) : 0;
    const currentPrice = Number(s.price);

    const cost = computeServiceCost({
      directLaborCost,
      materialCost,
      durationMinutes,
      fixedCostPerHour: ctx.fixedCostPerHour,
    });
    const pv = computeSellingPrice(
      cost.csvTotal,
      variablePercent,
      profitPercent,
    );
    const { gap, belowCost } = computePriceGap(
      currentPrice,
      pv.suggestedPrice,
    );

    return {
      serviceId: s.id,
      serviceName: s.name,
      unitId: s.unit.id,
      unitName: s.unit.name,
      currentPrice,
      durationMinutes,
      directLaborCost,
      materialCost,
      cost,
      suggestedPrice: pv.suggestedPrice,
      variablePercent,
      profitPercent,
      gap,
      belowCost,
      hasProfile: profile != null,
    };
  });

  return {
    rows,
    fixedCostPerHour: ctx.fixedCostPerHour,
    settings: {
      defaultVariableExpensePercent: ctx.settings.defaultVariableExpensePercent,
      defaultProfitMarginPercent: ctx.settings.defaultProfitMarginPercent,
    },
  };
}

export async function upsertServiceCostProfile(
  organizationId: string,
  serviceId: string,
  input: {
    directLaborCost: number;
    materialCost: number;
    durationMinutesOverride?: number | null;
    notes?: string | null;
  },
) {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, unit: { organizationId } },
    select: { id: true },
  });
  if (!service) throw new Error("Serviço não encontrado.");

  return prisma.serviceCostProfile.upsert({
    where: { serviceId },
    create: {
      organizationId,
      serviceId,
      directLaborCost: input.directLaborCost,
      materialCost: input.materialCost,
      durationMinutesOverride: input.durationMinutesOverride ?? null,
      notes: input.notes?.trim() || null,
    },
    update: {
      directLaborCost: input.directLaborCost,
      materialCost: input.materialCost,
      durationMinutesOverride: input.durationMinutesOverride ?? null,
      notes: input.notes?.trim() || null,
    },
  });
}

export async function applySuggestedPrice(
  organizationId: string,
  serviceId: string,
  price: number,
) {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, unit: { organizationId } },
    select: { id: true },
  });
  if (!service) throw new Error("Serviço não encontrado.");

  return prisma.service.update({
    where: { id: serviceId },
    data: { price },
  });
}

export async function countServicesBelowCost(
  organizationId: string,
): Promise<number> {
  const { rows } = await listServiceCostRows(organizationId);
  return rows.filter((r) => r.belowCost && r.cost.csvTotal > 0).length;
}
