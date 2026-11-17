"use client";

import { formatInTimeZone } from "date-fns-tz";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { formatBrPhoneNational } from "@/lib/br-input-masks";
import { cn } from "@/lib/utils";

type UnitOption = { id: string; name: string };
type StaffOption = { id: string; label: string };
type CatalogService = {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  unitId: string;
};

type Suggestion = {
  time: string;
  endsAtLabel: string;
  freeMinutes: number;
  kind: "clean";
};

type Conflict = {
  id: string;
  clientName: string;
  startsAtLabel: string;
  endsAtLabel: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  timezone: string;
  units: UnitOption[];
  staffOptions: StaffOption[];
  services: CatalogService[];
  /** STAFF: força o próprio id e esconde seletor */
  lockedStaffId?: string | null;
};

function todayYmd(tz: string): string {
  return formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
}

function nowHm(tz: string): string {
  return formatInTimeZone(new Date(), tz, "HH:mm");
}

export function AdminEncaixeSheet({
  open,
  onClose,
  onCreated,
  timezone,
  units,
  staffOptions,
  services,
  lockedStaffId,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [panelTheme, setPanelTheme] = useState<"light" | "dark">("dark");
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [serviceId, setServiceId] = useState("");
  const [staffMemberId, setStaffMemberId] = useState(lockedStaffId ?? "");
  const [date, setDate] = useState(() => todayYmd(timezone));
  const [time, setTime] = useState(() => nowHm(timezone));
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [loadingGaps, setLoadingGaps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [forcePrompt, setForcePrompt] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = document.querySelector(".brand-onyx");
    const themeAttr = root?.getAttribute("data-theme");
    setPanelTheme(themeAttr === "light" ? "light" : "dark");
  }, [open]);

  const unitServices = useMemo(
    () => services.filter((s) => !unitId || s.unitId === unitId),
    [services, unitId],
  );

  useEffect(() => {
    if (!open) return;
    setDate(todayYmd(timezone));
    setTime(nowHm(timezone));
    setUnitId(units[0]?.id ?? "");
    setServiceId("");
    setStaffMemberId(lockedStaffId ?? "");
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setSuggestions([]);
    setConflicts([]);
    setForcePrompt(false);
    setError("");
  }, [open, timezone, units, lockedStaffId]);

  useEffect(() => {
    if (!serviceId && unitServices[0]) {
      setServiceId(unitServices[0].id);
    } else if (
      serviceId &&
      unitServices.length &&
      !unitServices.some((s) => s.id === serviceId)
    ) {
      setServiceId(unitServices[0]?.id ?? "");
    }
  }, [unitServices, serviceId]);

  const loadGaps = useCallback(async () => {
    if (!open || !unitId || !serviceId || !date) return;
    setLoadingGaps(true);
    setError("");
    try {
      const q = new URLSearchParams({
        unitId,
        serviceId,
        date,
      });
      const staff = lockedStaffId || staffMemberId;
      if (staff) q.set("staffMemberId", staff);
      const res = await fetch(`/api/admin/appointments/encaixe?${q}`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        message?: string;
        suggestions?: Suggestion[];
        durationMinutes?: number;
      };
      if (!res.ok) {
        setSuggestions([]);
        setError(data.message ?? "Não foi possível calcular encaixes.");
        return;
      }
      setSuggestions(data.suggestions ?? []);
      setDurationMinutes(data.durationMinutes ?? null);
      if (data.suggestions?.[0] && !forcePrompt) {
        setTime(data.suggestions[0].time);
      }
    } catch {
      setError("Erro de rede ao buscar buracos livres.");
      setSuggestions([]);
    } finally {
      setLoadingGaps(false);
    }
  }, [
    open,
    unitId,
    serviceId,
    date,
    staffMemberId,
    lockedStaffId,
    forcePrompt,
  ]);

  useEffect(() => {
    void loadGaps();
  }, [loadGaps]);

  async function submit(force: boolean) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/appointments/encaixe", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId,
          serviceId,
          date,
          time,
          customerName,
          customerPhone,
          notes: notes.trim() || null,
          staffMemberId: lockedStaffId || staffMemberId || null,
          force,
        }),
      });
      const data = (await res.json()) as {
        message?: string;
        conflicts?: Conflict[];
        suggestions?: Suggestion[];
        forced?: boolean;
      };
      if (res.status === 409 && !force) {
        setConflicts(data.conflicts ?? []);
        setForcePrompt(true);
        if (data.suggestions?.length) setSuggestions(data.suggestions);
        setError(data.message ?? "Conflito de horário.");
        return;
      }
      if (!res.ok) {
        setError(data.message ?? "Não foi possível criar o encaixe.");
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError("Erro de rede. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  const nameOk = customerName.trim().length >= 2;
  const phoneOk = customerPhone.trim().length >= 8;
  const canSubmit = nameOk && phoneOk && Boolean(serviceId) && !saving;

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="brand-onyx fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4"
      data-theme={panelTheme}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="encaixe-title"
        className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] text-[var(--bn-on)] shadow-2xl sm:rounded-2xl"
        style={{ backgroundColor: "var(--bn-surface-elevated)" }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--bn-border)] px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--bn-muted)]">
              Balcão
            </p>
            <h2
              id="encaixe-title"
              className="text-lg font-semibold text-[var(--bn-on)]"
            >
              Encaixe · cliente na porta
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-[var(--bn-muted)] hover:bg-[var(--bn-elevated)]"
          >
            Fechar
          </button>
        </div>

        <div
          className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3"
          style={{ backgroundColor: "var(--bn-surface-elevated)" }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-1">
              <span className="font-medium text-[var(--bn-on)]">
                Nome do cliente
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2.5 text-[var(--bn-on)] outline-none ring-[var(--bn-primary)] focus:ring-2"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Quem está na porta"
                autoComplete="name"
                autoFocus
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-[var(--bn-on)]">Telefone</span>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2.5 text-[var(--bn-on)] outline-none ring-[var(--bn-primary)] focus:ring-2"
                value={customerPhone}
                onChange={(e) =>
                  setCustomerPhone(formatBrPhoneNational(e.target.value))
                }
                placeholder="(11) 99999-9999"
                inputMode="tel"
              />
            </label>
          </div>

          {units.length > 1 ? (
            <label className="block text-sm">
              <span className="text-[var(--bn-muted)]">Unidade</span>
              <select
                className="mt-1 w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-[var(--bn-on)]"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block text-sm">
            <span className="text-[var(--bn-muted)]">Serviço</span>
            <select
              className="mt-1 w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-[var(--bn-on)]"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              {unitServices.length === 0 ? (
                <option value="">Nenhum serviço nesta unidade</option>
              ) : (
                unitServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.durationMinutes} min · R$ {s.price.toFixed(0)}
                  </option>
                ))
              )}
            </select>
          </label>

          {!lockedStaffId && staffOptions.length > 0 ? (
            <label className="block text-sm">
              <span className="text-[var(--bn-muted)]">Profissional</span>
              <select
                className="mt-1 w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-[var(--bn-on)]"
                value={staffMemberId}
                onChange={(e) => setStaffMemberId(e.target.value)}
              >
                <option value="">Qualquer / sem atribuir</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">
              <span className="text-[var(--bn-muted)]">Data</span>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-[var(--bn-on)]"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-[var(--bn-muted)]">Horário</span>
              <input
                type="time"
                className="mt-1 w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-[var(--bn-on)]"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  setForcePrompt(false);
                  setConflicts([]);
                }}
              />
            </label>
          </div>

          {durationMinutes != null ? (
            <p className="text-xs text-[var(--bn-muted)]">
              Duração: {durationMinutes} min
              {loadingGaps ? " · buscando buracos…" : null}
            </p>
          ) : null}

          {suggestions.length > 0 ? (
            <div>
              <p className="mb-1.5 text-xs font-medium text-[var(--bn-muted)]">
                Encaixes limpos sugeridos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    onClick={() => {
                      setTime(s.time);
                      setForcePrompt(false);
                      setConflicts([]);
                    }}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                      time === s.time
                        ? "border-[var(--bn-primary)] bg-[var(--bn-primary)]/15 text-[var(--bn-primary)]"
                        : "border-[var(--bn-border)] text-[var(--bn-on)] hover:border-[var(--bn-primary)]/50",
                    )}
                  >
                    {s.time}–{s.endsAtLabel}
                  </button>
                ))}
              </div>
            </div>
          ) : !loadingGaps && serviceId ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              Sem buraco livre. Você ainda pode marcar um horário e forçar o
              encaixe se precisar atender.
            </p>
          ) : null}

          <label className="block text-sm">
            <span className="text-[var(--bn-muted)]">Observação (opcional)</span>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-[var(--bn-on)]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={240}
            />
          </label>

          {forcePrompt && conflicts.length > 0 ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-3 text-sm text-rose-100">
              <p className="font-medium">Atenção: conflito de agenda</p>
              <ul className="mt-1 list-inside list-disc text-xs opacity-90">
                {conflicts.map((c) => (
                  <li key={c.id}>
                    {c.clientName} · {c.startsAtLabel}–{c.endsAtLabel}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                O barbeiro assume o risco de atraso. Confirme só se for atender
                mesmo assim.
              </p>
            </div>
          ) : null}

          {error && !forcePrompt ? (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}
          {error && forcePrompt ? (
            <p className="text-xs text-rose-200/90">{error}</p>
          ) : null}
        </div>

        <div
          className="shrink-0 space-y-2 border-t border-[var(--bn-border)] px-4 py-3"
          style={{ backgroundColor: "var(--bn-surface-elevated)" }}
        >
          {!canSubmit && !forcePrompt ? (
            <p className="text-xs text-[var(--bn-muted)]">
              {!nameOk
                ? "Preencha o nome do cliente (mín. 2 letras)."
                : !phoneOk
                  ? "Preencha o telefone com DDD."
                  : !serviceId
                    ? "Escolha um serviço."
                    : null}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {forcePrompt ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setForcePrompt(false);
                    setConflicts([]);
                    setError("");
                  }}
                  className="rounded-xl border border-[var(--bn-border)] px-4 py-2.5 text-sm text-[var(--bn-on)]"
                >
                  Escolher outro horário
                </button>
                <button
                  type="button"
                  disabled={saving || !nameOk}
                  onClick={() => void submit(true)}
                  className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {saving ? "Salvando…" : "Atender mesmo assim"}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void submit(false)}
                className="rounded-xl bg-[var(--bn-primary)] px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-45"
              >
                {saving ? "Salvando…" : "Registrar encaixe"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
