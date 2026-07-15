import Link from "next/link";

import { cn } from "@/lib/utils";
import type { PlatformChartRange } from "@/lib/platform-ops";

const OPTIONS: { range: PlatformChartRange; label: string }[] = [
  { range: "7d", label: "7 dias" },
  { range: "30d", label: "30 dias" },
];

type Props = {
  current: PlatformChartRange;
};

export function PlatformOpsPeriodTabs({ current }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Período dos gráficos
        </p>
        <p className="mt-1 text-sm text-zinc-400">
          Evolução de cadastros e agendamentos na plataforma.
        </p>
      </div>
      <div
        className="flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-zinc-950/50 p-1"
        role="tablist"
        aria-label="Período dos gráficos"
      >
        {OPTIONS.map(({ range, label }) => {
          const active = current === range;
          return (
            <Link
              key={range}
              href={range === "30d" ? "/plataforma" : `/plataforma?range=${range}`}
              scroll={false}
              role="tab"
              aria-selected={active}
              className={cn(
                "rounded-xl px-3.5 py-1.5 text-sm transition",
                active
                  ? "bg-brand-500/20 text-brand-100"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
