"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

import type { AppointmentRow } from "@/lib/types";

export type BarberOption = {
  id: string;
  label: string;
  unitId: string | null;
};

type Props = {
  appointments: AppointmentRow[];
  footer?: ReactNode;
  /** Administradores / proprietário veem a coluna quando há várias unidades. */
  showUnitColumn?: boolean;
  /** Dono/admin veem coluna de profissional (barbeiro) atribuído. */
  showBarberColumn?: boolean;
  /** Lista de funcionários (STAFF) para o select de atribuição. */
  barbers?: BarberOption[];
  /** Só dono/admin podem alterar atribuição. */
  canAssignBarber?: boolean;
  /** Registar / limpar pagamento (balcão). */
  canManagePayment?: boolean;
  /** Título opcional acima da tabela. */
  title?: string;
  /** Subtítulo (ex.: total de registos). */
  subtitle?: string;
};

const statusStyles: Record<AppointmentRow["status"], string> = {
  CONFIRMED: "bg-emerald-500/15 text-emerald-300",
  COMPLETED: "bg-blue-500/15 text-blue-300",
  CANCELLED: "bg-rose-500/15 text-rose-300",
};

const statusLabel: Record<AppointmentRow["status"], string> = {
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

const selectClass =
  "max-w-[200px] rounded-lg border border-white/15 bg-zinc-950/80 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-brand-500/50 disabled:opacity-50";

const PAYMENT_METHODS = [
  { value: "", label: "Método" },
  { value: "PIX", label: "PIX" },
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Cartão", label: "Cartão" },
  { value: "Outro", label: "Outro" },
] as const;

function MarkPaidControls({
  item,
  saving,
  onPatch,
}: {
  item: AppointmentRow;
  saving: boolean;
  onPatch: (id: string, body: Record<string, unknown>) => void;
}) {
  const [method, setMethod] = useState("");
  return (
    <>
      <select
        className={selectClass}
        disabled={saving}
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        aria-label={`Método ao marcar pago — ${item.clientName}`}
      >
        {PAYMENT_METHODS.map((m) => (
          <option key={m.value || "empty"} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={saving}
        onClick={() =>
          onPatch(item.id, {
            paidAt: new Date().toISOString(),
            paymentMethod: method.trim() || null,
          })
        }
        className="rounded-lg bg-emerald-600/80 px-2 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
      >
        Marcar como pago
      </button>
    </>
  );
}

function barbersForRow(
  barbers: BarberOption[],
  unitId: string | null,
): BarberOption[] {
  if (!unitId) return barbers;
  return barbers.filter((b) => b.unitId === unitId || b.unitId === null);
}

export function AdminTable({
  appointments,
  footer,
  showUnitColumn = false,
  showBarberColumn = false,
  barbers = [],
  canAssignBarber = false,
  canManagePayment = false,
  title = "Agendamentos",
  subtitle,
}: Props) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patchAppointment(appointmentId: string, body: Record<string, unknown>) {
    setError(null);
    setSavingId(appointmentId);
    try {
      const res = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(payload.message ?? "Não foi possível atualizar.");
        return;
      }
      router.refresh();
    } catch {
      setError("Erro de rede. Tente de novo.");
    } finally {
      setSavingId(null);
    }
  }

  async function assignStaff(appointmentId: string, value: string) {
    const staffMemberId = value === "" ? null : value;
    await patchAppointment(appointmentId, { staffMemberId });
  }

  function canRecordPaymentForRow(status: AppointmentRow["status"]) {
    return status === "CONFIRMED" || status === "COMPLETED";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card overflow-hidden rounded-3xl"
    >
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="font-display text-lg font-normal uppercase tracking-wide text-white">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
        ) : null}
        {error ? (
          <p className="mt-2 text-sm text-rose-300">{error}</p>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px]">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.22em] text-zinc-400">
            <tr>
              <th className="px-5 py-4">Cliente</th>
              <th className="px-5 py-4">Serviço</th>
              {showUnitColumn ? <th className="px-5 py-4">Unidade</th> : null}
              {showBarberColumn ? (
                <th className="px-5 py-4">Profissional</th>
              ) : null}
              <th className="px-5 py-4">Data</th>
              <th className="px-5 py-4">Hora</th>
              <th className="px-5 py-4">Contato</th>
              <th className="px-5 py-4">Status</th>
              {canManagePayment ? (
                <th className="px-5 py-4 min-w-[200px]">Pagamento</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm text-zinc-200">
            {appointments.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-white/5">
                <td className="px-5 py-4 font-medium">{item.clientName}</td>
                <td className="px-5 py-4">{item.serviceName}</td>
                {showUnitColumn ? (
                  <td className="px-5 py-4 text-zinc-400">
                    {item.unitName ?? "—"}
                  </td>
                ) : null}
                {showBarberColumn ? (
                  <td className="px-5 py-4">
                    {canAssignBarber ? (
                      <select
                        className={selectClass}
                        disabled={savingId === item.id}
                        value={item.staffMemberId ?? ""}
                        onChange={(e) =>
                          void assignStaff(item.id, e.target.value)
                        }
                        aria-label={`Profissional para ${item.clientName}`}
                      >
                        <option value="">Sem profissional</option>
                        {barbersForRow(barbers, item.unitId ?? null).map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-zinc-400">
                        {item.assignedStaffLabel ?? "—"}
                      </span>
                    )}
                  </td>
                ) : null}
                <td className="px-5 py-4">
                  {format(new Date(item.startsAt), "dd 'de' MMMM", {
                    locale: ptBR,
                  })}
                </td>
                <td className="px-5 py-4">
                  {format(new Date(item.startsAt), "HH:mm")}
                </td>
                <td className="px-5 py-4 text-zinc-300">{item.clientPhone}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[item.status]}`}
                  >
                    {statusLabel[item.status]}
                  </span>
                </td>
                {canManagePayment ? (
                  <td className="px-5 py-4 align-top">
                    {item.status === "CANCELLED" ? (
                      <span className="text-zinc-500">—</span>
                    ) : canRecordPaymentForRow(item.status) ? (
                      <div className="flex max-w-[220px] flex-col gap-2">
                        {item.paidAt ? (
                          <>
                            <span className="text-xs text-emerald-300/90">
                              Pago{" "}
                              {format(new Date(item.paidAt), "dd/MM HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                            <select
                              className={selectClass}
                              disabled={savingId === item.id}
                              value={item.paymentMethod ?? ""}
                              onChange={(e) =>
                                void patchAppointment(item.id, {
                                  paymentMethod: e.target.value || null,
                                })
                              }
                              aria-label={`Método de pagamento — ${item.clientName}`}
                            >
                              {PAYMENT_METHODS.map((m) => (
                                <option key={m.value || "empty"} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                              {item.paymentMethod &&
                              !PAYMENT_METHODS.some(
                                (m) => m.value === item.paymentMethod,
                              ) ? (
                                <option value={item.paymentMethod}>
                                  {item.paymentMethod}
                                </option>
                              ) : null}
                            </select>
                            <button
                              type="button"
                              disabled={savingId === item.id}
                              onClick={() =>
                                void patchAppointment(item.id, { paidAt: null })
                              }
                              className="rounded-lg border border-white/15 px-2 py-1 text-left text-xs text-zinc-400 hover:border-rose-500/30 hover:text-rose-300"
                            >
                              Limpar pagamento
                            </button>
                          </>
                        ) : (
                          <MarkPaidControls
                            item={item}
                            saving={savingId === item.id}
                            onPatch={patchAppointment}
                          />
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </motion.div>
  );
}
