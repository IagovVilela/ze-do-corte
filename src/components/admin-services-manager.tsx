"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  SERVICE_CATEGORY_LABELS,
  SERVICE_CATEGORY_ORDER,
  type ServiceCategoryUi,
  isServiceCategory,
} from "@/lib/service-category";
import {
  formatBrMoneyFromNumber,
  parseBrMoneyInput,
  parseIntegerDigits,
} from "@/lib/br-input-masks";
import { cn, formatMoney } from "@/lib/utils";

type ServiceRow = {
  id: string;
  unitId: string;
  unitName: string;
  name: string;
  description: string;
  category: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  unitOverrides: {
    unitId: string;
    price: number | null;
    durationMinutes: number | null;
    isActive: boolean;
  }[];
};

function normalizeCategory(raw: string): ServiceCategoryUi {
  return isServiceCategory(raw) ? raw : "OUTRO";
}

type ServiceDraft = {
  unitId: string;
  name: string;
  description: string;
  category: ServiceCategoryUi;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  unitOverrides: Record<string, {
    price: number | null;
    durationMinutes: number | null;
    isActive: boolean;
  }>;
};

export type AdminUnitOption = {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
};

type Props = {
  initialServices: ServiceRow[];
  initialUnits: AdminUnitOption[];
};

const categoryBadgeClass: Record<ServiceCategoryUi, string> = {
  CORTE: "bg-sky-500/15 text-[var(--bn-primary)] ring-sky-500/30",
  BARBA: "bg-sky-500/15 text-[var(--bn-primary)] ring-sky-500/30",
  COMBO: "bg-[var(--bn-primary-container)]/15 text-[var(--bn-primary)] ring-[var(--bn-primary)]/30",
  TRATAMENTO: "bg-emerald-500/15 text-[var(--bn-status-ok)] ring-emerald-500/30",
  OUTRO: "bg-[var(--bn-surface-container)] text-[var(--bn-on-variant)] ring-[var(--bn-border)]",
};

function defaultUnitIdFromList(units: AdminUnitOption[]) {
  const active = units.filter((u) => u.isActive);
  return active.find((u) => u.isDefault)?.id ?? active[0]?.id ?? "";
}

export function AdminServicesManager({ initialServices, initialUnits }: Props) {
  const router = useRouter();
  const [services, setServices] = useState<ServiceRow[]>(() =>
    initialServices.map((s) => ({
      ...s,
      category: normalizeCategory(s.category),
    })),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [filterCategory, setFilterCategory] = useState<ServiceCategoryUi | "ALL">("ALL");
  const [filterUnit, setFilterUnit] = useState<"ALL" | string>("ALL");
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ServiceDraft | null>(null);

  const [newForm, setNewForm] = useState<ServiceDraft>(() => ({
    unitId: defaultUnitIdFromList(initialUnits),
    name: "",
    description: "",
    category: "OUTRO",
    durationMinutes: 30,
    price: 0,
    isActive: true,
    unitOverrides: {},
  }));

  const activeUnits = useMemo(
    () => initialUnits.filter((u) => u.isActive),
    [initialUnits],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (filterUnit !== "ALL" && s.unitId !== filterUnit) {
        return false;
      }
      if (filterCategory !== "ALL" && normalizeCategory(s.category) !== filterCategory) {
        return false;
      }
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.unitName.toLowerCase().includes(q)
      );
    });
  }, [services, filterCategory, filterUnit, search]);

  async function refreshList() {
    const res = await fetch("/api/admin/services");
    if (!res.ok) return;
    const data = (await res.json()) as { services: ServiceRow[] };
    setServices(
      data.services.map((s) => ({
        ...s,
        category: normalizeCategory(s.category),
      })),
    );
    router.refresh();
  }

  async function patchService(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<boolean> {
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(payload.message ?? "Erro ao atualizar.");
        return false;
      }
      setMessage("Alterações guardadas.");
      await refreshList();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
      return false;
    } finally {
      setPending(false);
    }
  }

  function openEdit(s: ServiceRow) {
    setEditingId(s.id);
    const overridesRec: Record<string, any> = {};
    for (const o of s.unitOverrides) {
      overridesRec[o.unitId] = { price: o.price, durationMinutes: o.durationMinutes, isActive: o.isActive };
    }
    setDraft({
      unitId: s.unitId,
      name: s.name,
      description: s.description,
      category: normalizeCategory(s.category),
      durationMinutes: s.durationMinutes,
      price: s.price,
      isActive: s.isActive,
      unitOverrides: overridesRec,
    });
  }

  function closeEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveEdit(id: string) {
    if (!draft) return;
    const name = draft.name.trim();
    const description = draft.description.trim();
    if (name.length < 2) {
      setError("Nome: mínimo 2 caracteres.");
      return;
    }
    if (description.length < 3) {
      setError("Descrição: mínimo 3 caracteres.");
      return;
    }
    if (draft.durationMinutes < 5 || draft.durationMinutes > 480) {
      setError("Duração entre 5 e 480 minutos.");
      return;
    }
    if (!draft.unitId) {
      setError("Selecione a unidade.");
      return;
    }
    const overridesArray = Object.entries(draft.unitOverrides).map(([uid, o]) => ({
      unitId: uid,
      price: o.price,
      durationMinutes: o.durationMinutes,
      isActive: o.isActive,
    }));

    const ok = await patchService(id, {
      unitId: draft.unitId,
      name,
      description,
      category: draft.category,
      durationMinutes: draft.durationMinutes,
      price: draft.price,
      isActive: draft.isActive,
      unitOverrides: overridesArray,
    });
    if (ok) closeEdit();
  }

  async function createService(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const name = newForm.name.trim();
    const description = newForm.description.trim();
    if (name.length < 2) {
      setError("Nome: mínimo 2 caracteres.");
      return;
    }
    if (description.length < 3) {
      setError("Descrição: mínimo 3 caracteres.");
      return;
    }
    if (!newForm.unitId) {
      setError("Selecione a unidade.");
      return;
    }
    setPending(true);
    try {
      const overridesArray = Object.entries(newForm.unitOverrides).map(([unitId, o]) => ({
        unitId,
        price: o.price,
        durationMinutes: o.durationMinutes,
        isActive: o.isActive,
      }));

      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: newForm.unitId,
          name,
          description,
          category: newForm.category,
          durationMinutes: newForm.durationMinutes,
          price: newForm.price,
          isActive: newForm.isActive,
          unitOverrides: overridesArray,
        }),
      });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(payload.message ?? "Erro ao criar.");
        return;
      }
      setMessage("Serviço criado.");
      setNewForm({
        unitId: defaultUnitIdFromList(initialUnits),
        name: "",
        description: "",
        category: "OUTRO",
        durationMinutes: 30,
        price: 0,
        isActive: true,
        unitOverrides: {},
      });
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setPending(false);
    }
  }

  async function removeService(id: string, name: string) {
    if (
      !confirm(
        `Excluir o serviço "${name}"? Só é permitido se não houver agendamentos associados.`,
      )
    ) {
      return;
    }
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(payload.message ?? "Erro ao excluir.");
        return;
      }
      setMessage("Serviço excluído.");
      if (editingId === id) closeEdit();
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setPending(false);
    }
  }

  const input =
    "w-full rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-3 py-2 text-sm text-[var(--bn-on)] outline-none focus:border-brand-500/60";
  const selectClass = `${input} appearance-none bg-[var(--bn-surface-lowest)]`;

  return (
    <div className="space-y-8">
      {message ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-[var(--bn-status-ok)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-[var(--bn-status-danger)]">
          {error}
        </p>
      ) : null}
      {activeUnits.length === 0 ? (
        <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm text-[var(--bn-status-info)]">
          Não há unidades ativas. Ative ou crie uma unidade em Unidades antes de adicionar serviços.
        </p>
      ) : null}

      <form
        onSubmit={(e) => void createService(e)}
        className="glass-card space-y-4 rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-[var(--bn-on)]">Novo serviço</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-[var(--bn-muted)]">Unidade</span>
            <select
              className={selectClass}
              required
              disabled={activeUnits.length === 0}
              value={newForm.unitId}
              onChange={(e) => setNewForm((f) => ({ ...f, unitId: e.target.value }))}
            >
              {activeUnits.length === 0 ? (
                <option value="">Nenhuma unidade ativa</option>
              ) : (
                activeUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.isDefault ? " (padrão)" : ""}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-[var(--bn-muted)]">Nome</span>
            <input
              className={input}
              value={newForm.name}
              onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
              required
              minLength={2}
              maxLength={120}
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-[var(--bn-muted)]">Descrição</span>
            <textarea
              className={`${input} min-h-[88px] resize-y`}
              value={newForm.description}
              onChange={(e) =>
                setNewForm((f) => ({ ...f, description: e.target.value }))
              }
              required
              minLength={3}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[var(--bn-muted)]">Tipo</span>
            <select
              className={selectClass}
              value={newForm.category}
              onChange={(e) =>
                setNewForm((f) => ({
                  ...f,
                  category: normalizeCategory(e.target.value),
                }))
              }
            >
              {SERVICE_CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {SERVICE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[var(--bn-muted)]">Duração (min)</span>
            <input
              inputMode="numeric"
              className={input}
              value={String(newForm.durationMinutes)}
              onChange={(e) =>
                setNewForm((f) => ({
                  ...f,
                  durationMinutes: parseIntegerDigits(e.target.value, 5) || 5,
                }))
              }
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[var(--bn-muted)]">Preço (R$)</span>
            <input
              inputMode="decimal"
              className={input}
              value={formatBrMoneyFromNumber(newForm.price)}
              onChange={(e) =>
                setNewForm((f) => ({
                  ...f,
                  price: parseBrMoneyInput(e.target.value),
                }))
              }
              placeholder="0,00"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--bn-on-variant)] sm:col-span-2">
            <input
              type="checkbox"
              checked={newForm.isActive}
              onChange={(e) =>
                setNewForm((f) => ({ ...f, isActive: e.target.checked }))
              }
            />
            Ativo no site e no agendamento
          </label>

          {initialUnits.length > 1 && (
            <div className="sm:col-span-2 border-t border-[var(--bn-border)] pt-4 mt-2">
              <h4 className="text-sm font-medium text-[var(--bn-on-variant)] mb-3">Preços Específicos por Unidade (Opcional)</h4>
              <div className="space-y-4">
                {initialUnits.map(unit => {
                  const ov = newForm.unitOverrides[unit.id] || { isActive: true, price: null, durationMinutes: null };
                  return (
                    <div key={unit.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center rounded-xl bg-[var(--bn-surface-low)] p-3 border border-[var(--bn-border)]">
                      <span className="text-sm text-[var(--bn-on-variant)] truncate">{unit.name}</span>
                      <label className="flex items-center gap-1.5 text-xs text-[var(--bn-muted)]">
                        Ativo:
                        <input
                          type="checkbox"
                          checked={ov.isActive}
                          onChange={(e) => setNewForm(f => ({
                            ...f,
                            unitOverrides: { ...f.unitOverrides, [unit.id]: { ...ov, isActive: e.target.checked } }
                          }))}
                        />
                      </label>
                      <input
                        inputMode="decimal"
                        placeholder={formatBrMoneyFromNumber(newForm.price) || "0,00"}
                        className="w-28 rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-2 py-1.5 text-xs text-[var(--bn-on)] placeholder:text-[var(--bn-muted)]"
                        value={
                          ov.price === null
                            ? ""
                            : formatBrMoneyFromNumber(ov.price)
                        }
                        onChange={(e) =>
                          setNewForm((f) => ({
                            ...f,
                            unitOverrides: {
                              ...f.unitOverrides,
                              [unit.id]: {
                                ...ov,
                                price:
                                  e.target.value === ""
                                    ? null
                                    : parseBrMoneyInput(e.target.value),
                              },
                            },
                          }))
                        }
                      />
                      <input
                        inputMode="numeric"
                        placeholder={`${newForm.durationMinutes}m`}
                        className="w-20 rounded-lg border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-2 py-1.5 text-xs text-[var(--bn-on)] placeholder:text-[var(--bn-muted)]"
                        value={
                          ov.durationMinutes === null
                            ? ""
                            : String(ov.durationMinutes)
                        }
                        onChange={(e) =>
                          setNewForm((f) => ({
                            ...f,
                            unitOverrides: {
                              ...f.unitOverrides,
                              [unit.id]: {
                                ...ov,
                                durationMinutes:
                                  e.target.value === ""
                                    ? null
                                    : parseIntegerDigits(e.target.value),
                              },
                            },
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={pending || activeUnits.length === 0}
          className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
        >
          Criar serviço
        </button>
      </form>

      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--bn-muted)]">
            Filtrar por unidade
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterUnit("ALL")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium ring-1 transition",
                filterUnit === "ALL"
                  ? "bg-[var(--bn-primary-container)]/15 text-[var(--bn-primary)] ring-brand-500/50"
                  : "text-[var(--bn-muted)] ring-[var(--bn-border)] hover:bg-[var(--bn-hover)]",
              )}
            >
              Todas ({services.length})
            </button>
            {activeUnits.map((u) => {
              const count = services.filter((s) => s.unitId === u.id).length;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setFilterUnit(u.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium ring-1 transition",
                    filterUnit === u.id
                      ? "bg-[var(--bn-primary-container)]/15 text-[var(--bn-primary)] ring-brand-500/50"
                      : "text-[var(--bn-muted)] ring-[var(--bn-border)] hover:bg-[var(--bn-hover)]",
                  )}
                >
                  {u.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--bn-muted)]">
            Filtrar por tipo
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterCategory("ALL")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium ring-1 transition",
                filterCategory === "ALL"
                  ? "bg-[var(--bn-primary-container)]/15 text-[var(--bn-primary)] ring-brand-500/50"
                  : "text-[var(--bn-muted)] ring-[var(--bn-border)] hover:bg-[var(--bn-hover)]",
              )}
            >
              Todos ({services.length})
            </button>
            {SERVICE_CATEGORY_ORDER.map((c) => {
              const count = services.filter((s) => normalizeCategory(s.category) === c).length;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilterCategory(c)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium ring-1 transition",
                    filterCategory === c
                      ? "bg-[var(--bn-primary-container)]/15 text-[var(--bn-primary)] ring-brand-500/50"
                      : "text-[var(--bn-muted)] ring-[var(--bn-border)] hover:bg-[var(--bn-hover)]",
                  )}
                >
                  {SERVICE_CATEGORY_LABELS[c]} ({count})
                </button>
              );
            })}
          </div>
        </div>
        <label className="block w-full max-w-sm space-y-1 text-sm sm:w-auto">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--bn-muted)]">
            Buscar
          </span>
          <input
            type="search"
            placeholder="Nome ou descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={input}
          />
        </label>
        </div>
      </div>

      <p className="text-sm text-[var(--bn-muted)]">
        A mostrar <strong className="text-[var(--bn-on-variant)]">{filtered.length}</strong> de{" "}
        {services.length} serviços.
      </p>

      <ul className="grid gap-4 sm:grid-cols-2">
        {filtered.map((s) => {
          const cat = normalizeCategory(s.category);
          const isEditing = editingId === s.id;
          return (
            <li
              key={s.id}
              className="glass-card flex flex-col rounded-2xl border border-[var(--bn-border)] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
                      categoryBadgeClass[cat],
                    )}
                  >
                    {SERVICE_CATEGORY_LABELS[cat]}
                  </span>
                  <p className="mt-1 text-xs text-[var(--bn-muted)]">{s.unitName}</p>
                  <h4 className="mt-1 text-base font-semibold text-[var(--bn-on)]">{s.name}</h4>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    s.isActive
                      ? "bg-emerald-500/15 text-[var(--bn-status-ok)]"
                      : "bg-[var(--bn-surface-container)] text-[var(--bn-muted)]",
                  )}
                >
                  {s.isActive ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--bn-muted)]">
                {s.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--bn-on-variant)]">
                <span>{s.durationMinutes} min</span>
                <span className="text-[var(--bn-muted)]">·</span>
                <span className="font-medium text-[var(--bn-primary)]">{formatMoney(s.price)}</span>
              </div>

              {!isEditing ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--bn-border)] pt-4">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void patchService(s.id, { isActive: !s.isActive })}
                    className="rounded-full border border-[var(--bn-border)] px-3 py-1.5 text-xs hover:bg-[var(--bn-hover)]"
                  >
                    {s.isActive ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => openEdit(s)}
                    className="rounded-full border border-brand-500/40 px-3 py-1.5 text-xs text-[var(--bn-primary)] hover:bg-brand-500/10"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void removeService(s.id, s.name)}
                    className="rounded-full border border-rose-500/35 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-500/10"
                  >
                    Excluir
                  </button>
                </div>
              ) : draft ? (
                <div className="mt-4 space-y-3 border-t border-[var(--bn-border)] pt-4">
                  <label className="block space-y-1 text-xs">
                    <span className="text-[var(--bn-muted)]">Unidade</span>
                    <select
                      className={selectClass}
                      value={draft.unitId}
                      onChange={(e) =>
                        setDraft((d) => (d ? { ...d, unitId: e.target.value } : d))
                      }
                    >
                      {initialUnits.map((u) => (
                        <option
                          key={u.id}
                          value={u.id}
                          disabled={!u.isActive && u.id !== draft.unitId}
                        >
                          {u.name}
                          {u.isDefault ? " (padrão)" : ""}
                          {!u.isActive ? " (inativa)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1 text-xs">
                    <span className="text-[var(--bn-muted)]">Nome</span>
                    <input
                      className={input}
                      value={draft.name}
                      onChange={(e) =>
                        setDraft((d) => (d ? { ...d, name: e.target.value } : d))
                      }
                    />
                  </label>
                  <label className="block space-y-1 text-xs">
                    <span className="text-[var(--bn-muted)]">Descrição</span>
                    <textarea
                      className={`${input} min-h-[80px] resize-y`}
                      value={draft.description}
                      onChange={(e) =>
                        setDraft((d) => (d ? { ...d, description: e.target.value } : d))
                      }
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs">
                      <span className="text-[var(--bn-muted)]">Tipo</span>
                      <select
                        className={selectClass}
                        value={draft.category}
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? { ...d, category: normalizeCategory(e.target.value) }
                              : d,
                          )
                        }
                      >
                        {SERVICE_CATEGORY_ORDER.map((c) => (
                          <option key={c} value={c}>
                            {SERVICE_CATEGORY_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="text-[var(--bn-muted)]">Duração (min)</span>
                      <input
                        inputMode="numeric"
                        className={input}
                        value={String(draft.durationMinutes)}
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  durationMinutes:
                                    parseIntegerDigits(e.target.value, 5) || 5,
                                }
                              : d,
                          )
                        }
                      />
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="text-[var(--bn-muted)]">Preço (R$)</span>
                      <input
                        inputMode="decimal"
                        className={input}
                        value={formatBrMoneyFromNumber(draft.price)}
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  price: parseBrMoneyInput(e.target.value),
                                }
                              : d,
                          )
                        }
                        placeholder="0,00"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[var(--bn-muted)] sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={draft.isActive}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, isActive: e.target.checked } : d,
                          )
                        }
                      />
                      Ativo
                    </label>

                    {initialUnits.length > 1 && (
                      <div className="sm:col-span-2 border-t border-[var(--bn-border)] pt-3 mt-1">
                        <h5 className="text-xs font-medium text-[var(--bn-muted)] mb-2">Preços por Unidade</h5>
                        <div className="space-y-2">
                          {initialUnits.map(unit => {
                            const ov = draft.unitOverrides[unit.id] || { isActive: true, price: null, durationMinutes: null };
                            return (
                              <div key={unit.id} className="flex flex-wrap gap-2 items-center rounded-lg bg-[var(--bn-surface-low)] px-3 py-2 border border-[var(--bn-border)]">
                                <span className="text-xs text-[var(--bn-on-variant)] flex-1 min-w-[80px] truncate">{unit.name}</span>
                                <label className="flex items-center gap-1 text-[10px] text-[var(--bn-muted)]">
                                  <input
                                    type="checkbox"
                                    checked={ov.isActive}
                                    onChange={(e) => setDraft(d => d ? {
                                      ...d,
                                      unitOverrides: { ...d.unitOverrides, [unit.id]: { ...ov, isActive: e.target.checked } }
                                    } : d)}
                                  />
                                </label>
                                <input
                                  inputMode="decimal"
                                  placeholder={
                                    formatBrMoneyFromNumber(draft.price) || "0,00"
                                  }
                                  className="w-24 rounded border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-1.5 py-1 text-xs text-[var(--bn-on-variant)] placeholder:text-[var(--bn-muted)]"
                                  value={
                                    ov.price === null
                                      ? ""
                                      : formatBrMoneyFromNumber(ov.price)
                                  }
                                  onChange={(e) =>
                                    setDraft((d) =>
                                      d
                                        ? {
                                            ...d,
                                            unitOverrides: {
                                              ...d.unitOverrides,
                                              [unit.id]: {
                                                ...ov,
                                                price:
                                                  e.target.value === ""
                                                    ? null
                                                    : parseBrMoneyInput(
                                                        e.target.value,
                                                      ),
                                              },
                                            },
                                          }
                                        : d,
                                    )
                                  }
                                />
                                <input
                                  inputMode="numeric"
                                  placeholder={`${draft.durationMinutes}m`}
                                  className="w-16 rounded border border-[var(--bn-border)] bg-[var(--bn-surface-lowest)] px-1.5 py-1 text-xs text-[var(--bn-on-variant)] placeholder:text-[var(--bn-muted)]"
                                  value={
                                    ov.durationMinutes === null
                                      ? ""
                                      : String(ov.durationMinutes)
                                  }
                                  onChange={(e) =>
                                    setDraft((d) =>
                                      d
                                        ? {
                                            ...d,
                                            unitOverrides: {
                                              ...d.unitOverrides,
                                              [unit.id]: {
                                                ...ov,
                                                durationMinutes:
                                                  e.target.value === ""
                                                    ? null
                                                    : parseIntegerDigits(
                                                        e.target.value,
                                                      ),
                                              },
                                            },
                                          }
                                        : d,
                                    )
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void saveEdit(s.id)}
                      className="rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-zinc-950 disabled:opacity-50"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={closeEdit}
                      className="rounded-full border border-[var(--bn-border)] px-4 py-2 text-xs text-[var(--bn-on-variant)]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-[var(--bn-border)] bg-[var(--bn-surface-low)] px-4 py-6 text-center text-sm text-[var(--bn-muted)]">
          Nenhum serviço corresponde ao filtro ou à pesquisa.
        </p>
      ) : null}
    </div>
  );
}
