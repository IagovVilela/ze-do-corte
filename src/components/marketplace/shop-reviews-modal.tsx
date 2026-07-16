"use client";

import { Star, X } from "lucide-react";
import { useEffect, useState } from "react";

type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  displayName: string;
  createdAt: string;
};

type Props = {
  slug: string;
  shopName: string;
  open: boolean;
  onClose: () => void;
};

export function ShopReviewsModal({ slug, shopName, open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avg, setAvg] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [reviews, setReviews] = useState<PublicReview[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/marketplace/reviews?slug=${encodeURIComponent(slug)}`,
        );
        const data = (await res.json()) as {
          message?: string;
          shop?: { ratingAvg: number | null; ratingCount: number };
          reviews?: PublicReview[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.message ?? "Não foi possível carregar as avaliações.");
          return;
        }
        setAvg(data.shop?.ratingAvg ?? null);
        setCount(data.shop?.ratingCount ?? 0);
        setReviews(data.reviews ?? []);
      } catch {
        if (!cancelled) setError("Erro de rede.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, slug]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-label={`Avaliações de ${shopName}`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-[#12171e] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <p className="text-sm font-semibold text-white">{shopName}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-amber-200">
              <Star className="size-3.5 fill-amber-300 text-amber-300" />
              {count > 0 && avg != null
                ? `${avg.toFixed(1)} · ${count} ${count === 1 ? "avaliação" : "avaliações"}`
                : "Ainda sem avaliações"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-zinc-500">Carregando…</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-rose-300">{error}</p>
          ) : reviews.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              Nenhuma avaliação publicada ainda.
            </p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-100">
                      {r.displayName}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={
                          i < r.rating
                            ? "size-3.5 fill-amber-300 text-amber-300"
                            : "size-3.5 text-zinc-600"
                        }
                      />
                    ))}
                  </div>
                  {r.comment ? (
                    <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                      {r.comment}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs italic text-zinc-500">
                      Sem comentário
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
