"use client";

import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";

import { formatBrPhoneNational } from "@/lib/br-phone-format";
import { cn } from "@/lib/utils";

type UnitRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  addressLine: string | null;
  phone: string | null;
  isActive: boolean;
  isDefault: boolean;
};

type UnitDraft = {
  name: string;
  slug: string;
  addressLine: string;
  city: string;
  phone: string;
};

type Props = {
  initialUnits: UnitRow[];
  canDeleteUnits: boolean;
  canEditUnitDetails: boolean;
};

export function AdminUnitsManager({
  initialUnits,
  canDeleteUnits,
  canEditUnitDetails,
}: Props) {
  const router = useRouter();
  const [units, setUnits] = useState(initialUnits);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<UnitDraft>({
    name: "",
    slug: "",
    addressLine: "",
    city: "",
    phone: "",
  });

  function openEdit(u: UnitRow) {
    setEditingId(u.id);
    setDraft({
      name: u.name,
      slug: u.slug,
      addressLine: u.addressLine ?? "",
      city: u.city ?? "",
      phone: formatBrPhoneNational(u.phone ?? ""),
    });
  }

  function closeEdit() {
    setEditingId(null);
  }

  async function saveEdit(unitId: string) {
    const trimmedName = draft.name.trim();
    if (trimmedName.length < 2) {
      setError("Nome da unidade: mínimo 2 caracteres.");
      return;
    }
    const trimmedSlug = draft.slug.trim();
    if (trimmedSlug.length < 2) {
      setError("Slug: mínimo 2 caracteres (identificador na URL).");
      return;
    }
    const ok = await patchUnit(unitId, {
      name: trimmedName,
      slug: trimmedSlug,
      addressLine: draft.addressLine.trim() || null,
      city: draft.city.trim() || null,
      phone: formatBrPhoneNational(draft.phone) || null,
    });
    if (ok) closeEdit();
  }

  async function refresh() {
    const res = await fetch("/api/admin/units");
    if (!res.ok) return;
    const data = (await res.json()) as { units: UnitRow[] };
    setUnits(
      data.units.map((u) => ({
        id: u.id,
        name: u.name,
        slug: u.slug,
        city: u.city,
        addressLine: u.addressLine,
        phone: u.phone,
        isActive: u.isActive,
        isDefault: u.isDefault,
      })),
    );
    router.refresh();
  }

  async function createUnit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          city: city || null,
          isDefault: false,
          isActive: true,
        }),
      });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(payload.message ?? "Erro ao criar.");
      setMessage("Unidade criada.");
      setName("");
      setCity("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setPending(false);
    }
  }

  async function patchUnit(
    id: string,
    patch: Record<string, unknown>,
  ): Promise<boolean> {
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const res = await fetch(`/api/admin/units/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(payload.message ?? "Erro ao atualizar.");
        return false;
      }
      setMessage("Guardado.");
      await refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function removeUnit(id: string) {
    if (!canDeleteUnits) return;
    if (!confirm("Remover esta unidade? Só é possível se não houver agendamentos.")) return;
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const res = await fetch(`/api/admin/units/${id}`, { method: "DELETE" });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(payload.message ?? "Erro ao remover.");
      setMessage("Unidade removida.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setPending(false);
    }
  }

  const input =
    "w-full rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500/60";

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
        onSubmit={createUnit}
        className="glass-card space-y-4 rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-white">Nova unidade</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-zinc-400">Nome</span>
            <input
              className={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-400">Cidade</span>
            <input
              className={input}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      <div className="glass-card overflow-hidden rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Cidade</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-zinc-200">
            {units.map((u) => (
              <Fragment key={u.id}>
                <tr>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{u.slug}</td>
                  <td className="px-4 py-3 text-zinc-400">{u.city ?? "—"}</td>
                  <td className="max-w-[140px] truncate px-4 py-3 text-zinc-400" title={u.phone ?? undefined}>
                    {u.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        u.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/20 text-zinc-400",
                      )}
                    >
                      {u.isActive ? "Ativa" : "Inativa"}
                    </span>
                    {u.isDefault ? (
                      <span className="ml-2 rounded-full bg-brand-500/20 px-2 py-0.5 text-xs text-brand-200">
                        Padrão (site)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {canEditUnitDetails ? (
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded-full border border-amber-500/35 px-3 py-1 text-xs text-amber-200 hover:bg-amber-500/10"
                          onClick={() => (editingId === u.id ? closeEdit() : openEdit(u))}
                        >
                          {editingId === u.id ? "Fechar" : "Editar dados"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded-full border border-white/15 px-3 py-1 text-xs hover:bg-white/5"
                        onClick={() => void patchUnit(u.id, { isActive: !u.isActive })}
                      >
                        {u.isActive ? "Desativar" : "Ativar"}
                      </button>
                      {!u.isDefault ? (
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded-full border border-brand-500/40 px-3 py-1 text-xs text-brand-200 hover:bg-brand-500/10"
                          onClick={() => void patchUnit(u.id, { isDefault: true })}
                        >
                          Tornar padrão
                        </button>
                      ) : null}
                      {canDeleteUnits ? (
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded-full border border-rose-500/40 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                          onClick={() => void removeUnit(u.id)}
                        >
                          Excluir
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
                {editingId === u.id && canEditUnitDetails ? (
                  <tr className="bg-white/[0.03]">
                    <td colSpan={6} className="px-4 py-5">
                      <p className="mb-4 text-xs text-zinc-500">
                        Só o <strong className="text-zinc-400">proprietário</strong> altera estes campos.
                        Slug: identificador estável na URL (evite mudar depois de divulgar links).
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1 text-sm">
                          <span className="text-zinc-400">Nome</span>
                          <input
                            className={input}
                            value={draft.name}
                            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-zinc-400">Slug (URL)</span>
                          <input
                            className={input}
                            value={draft.slug}
                            onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                            spellCheck={false}
                          />
                        </label>
                        <label className="space-y-1 text-sm sm:col-span-2">
                          <span className="text-zinc-400">Endereço (linha)</span>
                          <input
                            className={input}
                            value={draft.addressLine}
                            onChange={(e) => setDraft((d) => ({ ...d, addressLine: e.target.value }))}
                            placeholder="Rua, número, bairro…"
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-zinc-400">Cidade</span>
                          <input
                            className={input}
                            value={draft.city}
                            onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-zinc-400">Telefone</span>
                          <input
                            type="tel"
                            inputMode="numeric"
                            className={cn(input, "tabular-nums tracking-wide")}
                            value={draft.phone}
                            maxLength={15}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                phone: formatBrPhoneNational(e.target.value),
                              }))
                            }
                            placeholder="(00) 00000-0000"
                          />
                        </label>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
                          onClick={() => void saveEdit(u.id)}
                        >
                          Salvar alterações
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded-full border border-white/15 px-5 py-2 text-sm text-zinc-300 hover:bg-white/5"
                          onClick={closeEdit}
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
