import Link from "next/link";

import { PlatformReviewActions } from "@/components/plataforma/platform-review-actions";
import {
  planStatusLabel,
  planTierLabel,
} from "@/lib/org-entitlements";
import { getPlatformMarketplaceSnapshot } from "@/lib/platform-ops";
import { publicSurfaceUrl } from "@/lib/public-hosts";

export const dynamic = "force-dynamic";

export default async function PlataformaMarketplacePage() {
  const data = await getPlatformMarketplaceSnapshot();

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
            Marketplace
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Listagens e avaliações
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Salões visíveis no explorar e moderação de reviews.
          </p>
        </div>
        <Link
          href={publicSurfaceUrl("marketplace", "/explorar")}
          className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-zinc-300 hover:border-brand-500/40 hover:text-brand-200"
        >
          Abrir explorar
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-100">
          No ar ({data.shops.length})
        </h2>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3">Barbearia</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.shops.map((s) => (
                <tr key={s.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/plataforma/barbearias/${s.id}`}
                      className="font-medium text-zinc-100 hover:text-brand-200"
                    >
                      {s.name}
                    </Link>
                    <span className="mt-0.5 block font-mono text-[11px] text-zinc-500">
                      /{s.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{s.city || "—"}</td>
                  <td className="px-4 py-3 text-zinc-300">
                    {planStatusLabel(s.planStatus)} ·{" "}
                    {planTierLabel(s.planTier)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-300">
                    {s.ratingCount
                      ? `${s.ratingAvg?.toFixed(1)} (${s.ratingCount})`
                      : "—"}
                  </td>
                </tr>
              ))}
              {data.shops.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Nenhuma barbearia listada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-100">
          Avaliações recentes
        </h2>
        <PlatformReviewActions reviews={data.reviews} />
      </section>
    </div>
  );
}
