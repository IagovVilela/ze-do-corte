"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  defaultWorkWeekFromShop,
  timeChoicesForWorkDay,
  timeToMinutes,
  WORK_WEEK_DAY_KEYS,
  WORK_WEEK_LABELS_PT,
  type WorkDayState,
  type WorkWeekState,
} from "@/lib/work-week";
import { cn } from "@/lib/utils";

function isOpenDay(d: WorkDayState): d is { closed: false; start: string; end: string } {
  return !("closed" in d && d.closed);
}

function openDayEnd(d: WorkDayState): string {
  return isOpenDay(d) ? d.end : "20:00";
}

type Props = {
  initialWeek: WorkWeekState;
  usesCustomInitial: boolean;
};

export function AdminWorkScheduleForm({
  initialWeek,
  usesCustomInitial,
}: Props) {
  const router = useRouter();
  const [week, setWeek] = useState<WorkWeekState>(initialWeek);
  const [usesCustom, setUsesCustom] = useState(usesCustomInitial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaults = useMemo(() => defaultWorkWeekFromShop(), []);

  useEffect(() => {
    setWeek(initialWeek);
    setUsesCustom(usesCustomInitial);
  }, [initialWeek, usesCustomInitial]);

  function setDay(key: keyof WorkWeekState, day: WorkDayState) {
    setWeek((w) => ({ ...w, [key]: day }));
  }

  function applyDefaultsToForm() {
    setWeek(defaults);
    setMessage("Formulário igual ao horário da barbearia (ainda não guardado).");
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/work-schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(week),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Não foi possível guardar.");
        return;
      }
      setUsesCustom(true);
      setMessage("Expediente atualizado.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function removeCustomization() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/work-schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useShopDefault: true }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Não foi possível remover.");
        return;
      }
      setUsesCustom(false);
      setWeek(defaults);
      setMessage("A seguir o horário da barbearia. Pode personalizar de novo quando quiser.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const selectClass =
    "mt-1 w-full rounded-xl border border-white/15 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/30";

  return (
    <div className="glass-card max-w-2xl rounded-3xl border border-white/10 p-6 shadow-lg shadow-black/20">
      <p className="text-sm text-zinc-400">
        {usesCustom
          ? "Os clientes só veem horários dentro do seu expediente quando escolhem você no agendamento."
          : "Hoje segue o mesmo horário da barbearia. Guarde uma versão personalizada para ajustar por dia."}
      </p>

      <div className="mt-6 space-y-4">
        {WORK_WEEK_DAY_KEYS.map((key) => {
          const day = week[key];
          const label = WORK_WEEK_LABELS_PT[key];

          if (key === "0") {
            return (
              <div
                key={key}
                className="rounded-2xl border border-white/[0.06] bg-zinc-950/40 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-200">{label}</span>
                  <span className="text-xs text-zinc-500">Fechado (barbearia)</span>
                </div>
              </div>
            );
          }

          const open = isOpenDay(day);
          const { starts, ends } = timeChoicesForWorkDay(key);
          const startVal = open ? day.start : "09:00";
          const endOptions = ends.filter((e) => timeToMinutes(e) > timeToMinutes(startVal));

          return (
            <div
              key={key}
              className="rounded-2xl border border-white/[0.06] bg-zinc-950/40 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-medium text-zinc-200">{label}</span>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    checked={!open}
                    onChange={(e) =>
                      setDay(
                        key,
                        e.target.checked
                          ? { closed: true }
                          : {
                              closed: false,
                              start: "09:00",
                              end:
                                key === "6"
                                  ? openDayEnd(defaults["6"])
                                  : openDayEnd(defaults["1"]),
                            },
                      )
                    }
                    className="accent-brand-500"
                  />
                  Folga (sem atendimento)
                </label>
              </div>

              {open ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs text-zinc-500">
                    Início
                    <select
                      className={cn(selectClass, "tabular-nums")}
                      value={day.start}
                      onChange={(e) => {
                        const start = e.target.value;
                        const nextEnd =
                          timeToMinutes(day.end) <= timeToMinutes(start)
                            ? ends.find((t) => timeToMinutes(t) > timeToMinutes(start)) ??
                              day.end
                            : day.end;
                        setDay(key, {
                          closed: false,
                          start,
                          end: nextEnd,
                        });
                      }}
                    >
                      {starts.map((t) => (
                        <option key={t} value={t} className="bg-zinc-900">
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs text-zinc-500">
                    Fim (último horário em que um atendimento pode terminar)
                    <select
                      className={cn(selectClass, "tabular-nums")}
                      value={day.end}
                      onChange={(e) =>
                        setDay(key, {
                          closed: false,
                          start: day.start,
                          end: e.target.value,
                        })
                      }
                    >
                      {endOptions.map((t) => (
                        <option key={t} value={t} className="bg-zinc-900">
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 text-sm text-emerald-300" role="status">
          {message}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-brand-400 disabled:opacity-50"
        >
          {saving ? "A guardar…" : "Guardar expediente"}
        </button>
        <button
          type="button"
          disabled={saving || !usesCustom}
          onClick={() => void removeCustomization()}
          className="rounded-full border border-white/15 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5 disabled:opacity-40"
        >
          Usar só horário da barbearia
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={applyDefaultsToForm}
          className="rounded-full border border-white/10 px-4 py-2.5 text-sm text-zinc-400 transition hover:bg-white/5"
        >
          Preencher como a barbearia
        </button>
      </div>
    </div>
  );
}
