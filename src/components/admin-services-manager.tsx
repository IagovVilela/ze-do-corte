"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  SERVICE_CATEGORY_LABELS,
  SERVICE_CATEGORY_ORDER,
  type ServiceCategoryUi,
  isServiceCategory,
} from "@/lib/service-category";
import { cn, formatMoney } from "@/lib/utils";

type ServiceRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
};

function normalizeCategory(raw: string): ServiceCategoryUi {
  return isServiceCategory(raw) ? raw : "OUTRO";
}

type ServiceDraft = {
  name: string;
  description: string;
  category: ServiceCategoryUi;
  durationMinutes: number;
  price: number;
  isActive: boolean;
};

type Props = { initialServices: ServiceRow[] };

const categoryBadgeClass: Record<ServiceCategoryUi, string> = {
  CORTE: "bg-sky-500/15 text-sky-200 ring-sky-500/30",
  BARBA: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  COMBO: "bg-violet-500/15 text-violet-200 ring-violet-500/30",
  TRATAMENTO: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  OUTRO: "bg-zinc-500/20 text-zinc-300 ring-white/10",
};

export function AdminServicesManager({ initialServices }: Props) {
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
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ServiceDraft | null>(null);

  const [newForm, setNewForm] = useState<ServiceDraft>({
    name: "",
    description: "",
    category: "OUTRO",
    durationMinutes: 30,
    price: 0,
    isActive: true,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (filterCategory !== "ALL" && normalizeCategory(s.category) !== filterCategory) {
        return false;
      }
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      );
    });
  }, [services, filterCategory, search]);

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
    setDraft({
      name: s.name,
      description: s.description,
      category: normalizeCategory(s.category),
      durationMinutes: s.durationMinutes,
      price: s.price,
      isActive: s.isActive,
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
    const ok = await patchService(id, {
      name,
      description,
      category: draft.category,
      durationMinutes: draft.durationMinutes,
      price: draft.price,
      isActive: draft.isActive,
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
    setPending(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          category: newForm.category,
          durationMinutes: newForm.durationMinutes,
          price: newForm.price,
          isActive: newForm.isActive,
        }),
      });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(payload.message ?? "Erro ao criar.");
        return;
      }
      setMessage("Serviço criado.");
      setNewForm({
        name: "",
        description: "",
        category: "OUTRO",
        durationMinutes: 30,
        price: 0,
        isActive: true,
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
    "w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/60";
  const selectClass = `${input} appearance-none bg-zinc-950/50`;

  return (
    <div className="space-y-8">
      {message ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(e) => void createService(e)}
        className="glass-card space-y-4 rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-white">Novo serviço</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-zinc-400">Nome</span>
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
            <span className="text-zinc-400">Descrição</span>
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
            <span className="text-zinc-400">Tipo</span>
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
            <span className="text-zinc-400">Duração (min)</span>
            <input
              type="number"
              min={5}
              max={480}
              step={5}
              className={input}
              value={newForm.durationMinutes}
              onChange={(e) =>
                setNewForm((f) => ({
                  ...f,
                  durationMinutes: Number.parseInt(e.target.value, 10) || 5,
                }))
              }
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-400">Preço (R$)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              className={input}
              value={newForm.price}
              onChange={(e) =>
                setNewForm((f) => ({
                  ...f,
                  price: Number.parseFloat(e.target.value) || 0,
                }))
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={newForm.isActive}
              onChange={(e) =>
                setNewForm((f) => ({ ...f, isActive: e.target.checked }))
              }
            />
            Ativo no site e no agendamento
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
        >
          Criar serviço
        </button>
      </form>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Filtrar por tipo
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterCategory("ALL")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium ring-1 transition",
                filterCategory === "ALL"
                  ? "bg-brand-500/25 text-brand-100 ring-brand-500/50"
                  : "text-zinc-400 ring-white/10 hover:bg-white/5",
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
                      ? "bg-brand-500/25 text-brand-100 ring-brand-500/50"
                      : "text-zinc-400 ring-white/10 hover:bg-white/5",
                  )}
                >
                  {SERVICE_CATEGORY_LABELS[c]} ({count})
                </button>
              );
            })}
          </div>
        </div>
        <label className="block w-full max-w-sm space-y-1 text-sm sm:w-auto">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
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

      <p className="text-sm text-zinc-500">
        A mostrar <strong className="text-zinc-300">{filtered.length}</strong> de{" "}
        {services.length} serviços.
      </p>

      <ul className="grid gap-4 sm:grid-cols-2">
        {filtered.map((s) => {
          const cat = normalizeCategory(s.category);
          const isEditing = editingId === s.id;
          return (
            <li
              key={s.id}
              className="glass-card flex flex-col rounded-2xl border border-white/5 p-5"
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
                  <h4 className="mt-2 text-base font-semibold text-white">{s.name}</h4>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    s.isActive
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-zinc-600/30 text-zinc-400",
                  )}
                >
                  {s.isActive ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                {s.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-300">
                <span>{s.durationMinutes} min</span>
                <span className="text-zinc-600">·</span>
                <span className="font-medium text-brand-200">{formatMoney(s.price)}</span>
              </div>

              {!isEditing ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void patchService(s.id, { isActive: !s.isActive })}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5"
                  >
                    {s.isActive ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => openEdit(s)}
                    className="rounded-full border border-brand-500/40 px-3 py-1.5 text-xs text-brand-200 hover:bg-brand-500/10"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void removeService(s.id, s.name)}
                    className="rounded-full border border-rose-500/35 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10"
                  >
                    Excluir
                  </button>
                </div>
              ) : draft ? (
                <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                  <label className="block space-y-1 text-xs">
                    <span className="text-zinc-500">Nome</span>
                    <input
                      className={input}
                      value={draft.name}
                      onChange={(e) =>
                        setDraft((d) => (d ? { ...d, name: e.target.value } : d))
                      }
                    />
                  </label>
                  <label className="block space-y-1 text-xs">
                    <span className="text-zinc-500">Descrição</span>
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
                      <span className="text-zinc-500">Tipo</span>
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
                      <span className="text-zinc-500">Duração (min)</span>
                      <input
                        type="number"
                        min={5}
                        max={480}
                        step={5}
                        className={input}
                        value={draft.durationMinutes}
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  durationMinutes:
                                    Number.parseInt(e.target.value, 10) || 5,
                                }
                              : d,
                          )
                        }
                      />
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="text-zinc-500">Preço (R$)</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className={input}
                        value={draft.price}
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  price: Number.parseFloat(e.target.value) || 0,
                                }
                              : d,
                          )
                        }
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-zinc-400">
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
                      className="rounded-full border border-white/15 px-4 py-2 text-xs text-zinc-300"
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
        <p className="rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500">
          Nenhum serviço corresponde ao filtro ou à pesquisa.
        </p>
      ) : null}
    </div>
  );
}
