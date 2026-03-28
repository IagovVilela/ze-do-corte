"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Fragment, useState } from "react";

import { AdminWorkScheduleForm } from "@/components/admin-work-schedule-form";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import {
  defaultWorkWeekFromShop,
  parseWorkWeekFromDb,
  type WorkWeekState,
} from "@/lib/work-week";
import { cn } from "@/lib/utils";

type StaffRow = {
  id: string;
  email: string;
  displayName: string | null;
  role: "OWNER" | "ADMIN" | "STAFF";
  unitId: string | null;
  unitName: string | null;
  hasPassword: boolean;
  websiteBio: string | null;
  showOnWebsite: boolean;
  workWeekInitialWeek?: WorkWeekState;
  workWeekUsesCustom?: boolean;
};

type Props = {
  initialStaff: StaffRow[];
  units: { id: string; name: string }[];
  canAssignAdmins: boolean;
};

const rolePt: Record<StaffRow["role"], string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  STAFF: "Funcionário",
};

export function AdminStaffManager({
  initialStaff,
  units,
  canAssignAdmins,
}: Props) {
  const router = useRouter();
  const [staff, setStaff] = useState(initialStaff);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"STAFF" | "ADMIN" | "OWNER">("STAFF");
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [initialPassword, setInitialPassword] = useState("");
  const [initialPasswordConfirm, setInitialPasswordConfirm] = useState("");

  async function refresh() {
    const res = await fetch("/api/admin/staff");
    if (!res.ok) return;
    const defaults = defaultWorkWeekFromShop();
    const data = (await res.json()) as {
      staff: {
        id: string;
        email: string;
        displayName: string | null;
        role: StaffRow["role"];
        unitId: string | null;
        unit: { name: string } | null;
        hasPassword: boolean;
        websiteBio: string | null;
        showOnWebsite: boolean;
        workWeekJson?: unknown;
      }[];
    };
    setStaff(
      data.staff.map((s) => {
        const base: StaffRow = {
          id: s.id,
          email: s.email,
          displayName: s.displayName,
          role: s.role,
          unitId: s.unitId,
          unitName: s.unit?.name ?? null,
          hasPassword: s.hasPassword,
          websiteBio: s.websiteBio,
          showOnWebsite: s.showOnWebsite,
        };
        if (s.role !== "STAFF") return base;
        const custom = parseWorkWeekFromDb(s.workWeekJson ?? null);
        return {
          ...base,
          workWeekInitialWeek: custom ?? defaults,
          workWeekUsesCustom: custom !== null,
        };
      }),
    );
    router.refresh();
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (initialPassword.length < MIN_PASSWORD_LENGTH) {
      setError(
        `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
      return;
    }
    if (initialPassword !== initialPasswordConfirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          displayName: displayName || null,
          role: canAssignAdmins ? role : "STAFF",
          unitId: role === "STAFF" ? unitId : null,
          initialPassword,
        }),
      });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(payload.message ?? "Erro ao criar.");
      setMessage(
        "Membro adicionado. Informe o e-mail e a senha ao usuário; ele entra em /admin/login.",
      );
      setEmail("");
      setDisplayName("");
      setInitialPassword("");
      setInitialPasswordConfirm("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setPending(false);
    }
  }

  function updateStaffLocal(id: string, patch: Partial<StaffRow>) {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function saveWebsiteProfile(id: string, websiteBio: string, showOnWebsite: boolean) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteBio: websiteBio.trim() || null,
          showOnWebsite,
        }),
      });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(payload.message ?? "Erro ao guardar.");
      setMessage("Perfil no site atualizado.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setPending(false);
    }
  }

  async function removeMember(id: string) {
    if (!confirm("Remover este membro da equipe?")) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
      const payload = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(payload.message ?? "Erro.");
      setMessage("Removido.");
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
        onSubmit={addMember}
        className="glass-card space-y-4 rounded-2xl p-6"
      >
        <h3 className="text-lg font-semibold text-white">Novo membro</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-zinc-400">E-mail (login no painel)</span>
            <input
              className={input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-400">Nome de exibição (opcional)</span>
            <input
              className={input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          {canAssignAdmins ? (
            <label className="space-y-1 text-sm">
              <span className="text-zinc-400">Papel</span>
              <select
                className={input}
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "STAFF" | "ADMIN" | "OWNER")
                }
              >
                <option value="STAFF">Funcionário</option>
                <option value="ADMIN">Administrador</option>
                <option value="OWNER">Proprietário</option>
              </select>
            </label>
          ) : null}
          {role === "STAFF" && units.length > 0 ? (
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-zinc-400">Unidade</span>
              <select
                className={input}
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                required
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-zinc-400">
              Senha inicial (mín. {MIN_PASSWORD_LENGTH} caracteres)
            </span>
            <input
              className={input}
              type="password"
              autoComplete="new-password"
              value={initialPassword}
              onChange={(e) => setInitialPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-zinc-400">Confirmar senha</span>
            <input
              className={input}
              type="password"
              autoComplete="new-password"
              value={initialPasswordConfirm}
              onChange={(e) => setInitialPasswordConfirm(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending || (role === "STAFF" && !unitId)}
          className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
        >
          Adicionar
        </button>
      </form>

      <div className="glass-card overflow-hidden rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Unidade</th>
              <th className="px-4 py-3">Senha</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-zinc-200">
            {staff.map((s) => (
              <Fragment key={s.id}>
                <tr>
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.email}</div>
                    {s.displayName ? (
                      <div className="text-xs text-zinc-500">{s.displayName}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{rolePt[s.role]}</td>
                  <td className="px-4 py-3 text-zinc-400">{s.unitName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        s.hasPassword ? "text-emerald-400" : "text-amber-400/90"
                      }
                    >
                      {s.hasPassword ? "Definida" : "Sem senha"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded-full border border-rose-500/40 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                      onClick={() => void removeMember(s.id)}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
                {s.role === "STAFF" ? (
                  <tr className="bg-white/[0.02]">
                    <td colSpan={5} className="px-4 py-4">
                      <p className="mb-3 text-xs text-zinc-500">
                        <strong className="text-zinc-400">Página inicial:</strong> a foto
                        vem do <strong className="text-zinc-400">Meu perfil</strong> de
                        cada barbeiro. Abaixo: texto apresentado no cartão e se aparece na
                        home.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                        <label className="block space-y-1 text-sm">
                          <span className="text-zinc-500">Descrição no site (máx. 400)</span>
                          <textarea
                            className={`${input} min-h-[72px] resize-y`}
                            value={s.websiteBio ?? ""}
                            maxLength={400}
                            onChange={(e) =>
                              updateStaffLocal(s.id, { websiteBio: e.target.value })
                            }
                            placeholder="Ex.: Especialista em degradê e barba desenhada."
                          />
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                          <input
                            type="checkbox"
                            checked={s.showOnWebsite}
                            onChange={(e) =>
                              updateStaffLocal(s.id, { showOnWebsite: e.target.checked })
                            }
                            className="accent-brand-500"
                          />
                          Mostrar na home
                        </label>
                      </div>
                      <button
                        type="button"
                        disabled={pending}
                        className="mt-3 rounded-full bg-brand-500/90 px-4 py-1.5 text-xs font-semibold text-zinc-950 disabled:opacity-50"
                        onClick={() =>
                          void saveWebsiteProfile(
                            s.id,
                            s.websiteBio ?? "",
                            s.showOnWebsite,
                          )
                        }
                      >
                        Guardar página inicial
                      </button>
                    </td>
                  </tr>
                ) : null}
                {s.role === "STAFF" &&
                s.workWeekInitialWeek !== undefined &&
                s.workWeekUsesCustom !== undefined ? (
                  <tr className="bg-white/[0.02]">
                    <td colSpan={5} className="px-4 py-3">
                      <details className="group rounded-xl border border-white/[0.08] bg-zinc-950/30 open:border-white/15">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm outline-none marker:content-none [&::-webkit-details-marker]:hidden">
                          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-medium text-zinc-300">Expediente</span>
                            <span className="text-zinc-600">·</span>
                            <span className="truncate text-zinc-400">
                              {s.displayName?.trim() || s.email}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                                s.workWeekUsesCustom
                                  ? "bg-brand-500/15 text-brand-300"
                                  : "bg-zinc-600/20 text-zinc-500",
                              )}
                            >
                              {s.workWeekUsesCustom ? "Personalizado" : "Horário da barbearia"}
                            </span>
                          </span>
                          <ChevronDown className="size-4 shrink-0 text-zinc-500 transition-transform duration-200 group-open:rotate-180" />
                        </summary>
                        <div className="border-t border-white/5 px-3 pb-3 pt-2">
                          <AdminWorkScheduleForm
                            key={`${s.id}-schedule`}
                            layout="compact"
                            initialWeek={s.workWeekInitialWeek}
                            usesCustomInitial={s.workWeekUsesCustom}
                            managedStaffMemberId={s.id}
                            managedStaffLabel={s.displayName?.trim() || s.email}
                            onScheduleSaved={() => void refresh()}
                          />
                        </div>
                      </details>
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
