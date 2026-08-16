import { isSupportAssistRole, maskEmail, maskPhone } from "@/lib/pii-mask";
import type { StaffAccess } from "@/lib/staff-access";

export function maskAppointmentLike<
  T extends {
    clientPhone?: string | null;
    clientEmail?: string | null;
    clientManageToken?: string | null;
    amountPaid?: unknown;
    paymentMethod?: string | null;
  },
>(row: T): T {
  return {
    ...row,
    clientPhone: maskPhone(row.clientPhone),
    clientEmail: maskEmail(row.clientEmail),
    clientManageToken: null,
    amountPaid: null,
    paymentMethod: null,
  };
}

export function applyAssistMasksIfNeeded<T>(
  access: StaffAccess,
  payload: T,
  mask: (value: T) => T,
): T {
  if (!isSupportAssistRole(access.role)) return payload;
  return mask(payload);
}
