"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ReactNode } from "react";

import type { AppointmentRow } from "@/lib/types";

type Props = {
  appointments: AppointmentRow[];
  footer?: ReactNode;
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

export function AdminTable({ appointments, footer }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card overflow-hidden rounded-3xl"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.22em] text-zinc-400">
            <tr>
              <th className="px-5 py-4">Cliente</th>
              <th className="px-5 py-4">Serviço</th>
              <th className="px-5 py-4">Data</th>
              <th className="px-5 py-4">Hora</th>
              <th className="px-5 py-4">Contato</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm text-zinc-200">
            {appointments.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-white/5">
                <td className="px-5 py-4 font-medium">{item.clientName}</td>
                <td className="px-5 py-4">{item.serviceName}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </motion.div>
  );
}
