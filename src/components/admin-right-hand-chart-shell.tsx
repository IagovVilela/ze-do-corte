import type { ReactNode } from "react";

import type { ConfidenceLevel } from "@/lib/right-hand-confidence";
import { confidenceLabel } from "@/lib/right-hand-confidence";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  confidence?: ConfidenceLevel;
  className?: string;
  children: ReactNode;
  id?: string;
};

export function AdminRightHandChartShell({
  title,
  subtitle,
  confidence = "conclusive",
  className,
  children,
  id,
}: Props) {
  const badge = confidenceLabel(confidence);
  return (
    <div
      id={id}
      className={cn(
        "scroll-mt-24 rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface)] p-5",
        confidence === "indicative" && "opacity-70",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--bn-on)]">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-xs text-[var(--bn-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {badge ? (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-200 uppercase">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
