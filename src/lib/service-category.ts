/** Alinhado ao enum `ServiceCategory` do Prisma (para UI e validação sem acoplar o client ao Prisma em todos os ficheiros). */
export const SERVICE_CATEGORY_ORDER = [
  "CORTE",
  "BARBA",
  "COMBO",
  "TRATAMENTO",
  "OUTRO",
] as const;

export type ServiceCategoryUi = (typeof SERVICE_CATEGORY_ORDER)[number];

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategoryUi, string> = {
  CORTE: "Corte",
  BARBA: "Barba",
  COMBO: "Combo",
  TRATAMENTO: "Tratamento",
  OUTRO: "Outro",
};

export function isServiceCategory(value: string): value is ServiceCategoryUi {
  return (SERVICE_CATEGORY_ORDER as readonly string[]).includes(value);
}
