"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";

type Alert = {
  id: string;
  severity: "warning" | "danger" | "info";
  title: string;
  description: string;
  href?: string;
};

export function FinanceGerencialAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    void fetch("/api/admin/finance/alerts", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { alerts: [] }))
      .then((d: { alerts: Alert[] }) => setAlerts(d.alerts ?? []))
      .catch(() => setAlerts([]));
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a.id}
          className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${
            a.severity === "danger"
              ? "border-[var(--bn-status-danger)]/40 bg-[var(--bn-status-danger)]/5"
              : a.severity === "warning"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-[var(--bn-outline)] bg-[var(--bn-surface)]"
          }`}
        >
          {a.severity === "danger" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bn-status-danger)]" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--bn-primary)]" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[var(--bn-on)]">{a.title}</p>
            <p className="text-[var(--bn-on-variant)]">{a.description}</p>
            {a.href ? (
              <Link
                href={a.href}
                className="mt-1 inline-block text-xs font-medium text-[var(--bn-primary)] hover:underline"
              >
                Ver detalhes
              </Link>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
