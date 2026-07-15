"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { MapPin, Search } from "lucide-react";

import { MARKETPLACE_CATEGORY_CHIPS } from "@/lib/marketplace-shared";
import { marketplaceHomePath } from "@/lib/public-hosts";
import { cn } from "@/lib/utils";

type Props = {
  initialQ?: string;
  initialCity?: string;
  initialCategory?: string;
};

export function ExploreSearch({
  initialQ = "",
  initialCity = "",
  initialCategory = "",
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [city, setCity] = useState(initialCity);

  function submit(e?: FormEvent, category?: string) {
    e?.preventDefault();
    const params = new URLSearchParams();
    const qTrim = q.trim();
    const cityTrim = city.trim();
    const cat =
      category !== undefined ? category : initialCategory.trim().toUpperCase();
    if (qTrim) params.set("q", qTrim);
    if (cityTrim) params.set("city", cityTrim);
    if (cat) params.set("category", cat);
    const qs = params.toString();
    const home = marketplaceHomePath();
    router.push(qs ? `${home}?${qs}` : home);
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => submit(e)}
        className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#161b22]/90 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur md:flex-row md:items-center"
      >
        <label className="flex flex-1 items-center gap-2 px-3 py-2">
          <Search className="size-4 shrink-0 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquise serviços ou empresas"
            className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
            aria-label="Serviço ou barbearia"
          />
        </label>
        <div className="hidden h-8 w-px bg-white/10 md:block" />
        <label className="flex flex-1 items-center gap-2 px-3 py-2">
          <MapPin className="size-4 shrink-0 text-zinc-500" />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Cidade"
            className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
            aria-label="Cidade"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-brand-400 md:self-stretch"
        >
          Buscar
        </button>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {MARKETPLACE_CATEGORY_CHIPS.map((chip) => {
          const active =
            (chip.id === "" && !initialCategory) ||
            chip.id === initialCategory.toUpperCase();
          return (
            <button
              key={chip.id || "all"}
              type="button"
              onClick={() => submit(undefined, chip.id)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition",
                active
                  ? "border-brand-500/50 bg-brand-500 text-zinc-950"
                  : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-brand-500/30 hover:bg-brand-500/10",
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
