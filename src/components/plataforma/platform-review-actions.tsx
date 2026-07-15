"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  clientName: string | null;
  clientPhone: string;
  createdAt: string;
  organization: { id: string; name: string; slug: string };
};

export function PlatformReviewActions({ reviews }: { reviews: ReviewRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm("Remover esta avaliação do marketplace?")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/plataforma/reviews/${id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Falha ao remover.");
        return;
      }
      router.refresh();
    } catch {
      setError("Erro de rede.");
    } finally {
      setBusyId(null);
    }
  }

  if (reviews.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-zinc-500">
        Nenhuma avaliação ainda.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Barbearia</th>
              <th className="px-4 py-3">Nota</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Comentário</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {reviews.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-medium text-zinc-100">
                  {r.organization.name}
                </td>
                <td className="px-4 py-3 tabular-nums text-amber-200">
                  {r.rating}★
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {r.clientName || r.clientPhone}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-zinc-400">
                  {r.comment || "—"}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void remove(r.id)}
                    className="text-xs text-rose-300 hover:text-rose-200 disabled:opacity-50"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
