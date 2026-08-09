import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Package,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { AdminMorningBriefingAi } from "@/components/admin-morning-briefing-ai";
import type {
  AdminMorningBriefing,
  MorningBriefingCard,
  MorningBriefingKind,
  MorningBriefingTone,
} from "@/lib/admin-morning-briefing";
import { cn } from "@/lib/utils";

type Props = {
  briefing: AdminMorningBriefing;
  /** Liga o botão de narrativa IA (fase 2) quando o servidor permite. */
  aiEnabled?: boolean;
};

function kindIcon(kind: MorningBriefingKind) {
  switch (kind) {
    case "agenda":
      return CalendarClock;
    case "cash":
      return Wallet;
    case "retention":
      return Users;
    case "club":
      return Sparkles;
    case "stock":
      return Package;
    case "positive":
      return TrendingUp;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function toneClasses(tone: MorningBriefingTone): string {
  switch (tone) {
    case "urgent":
      return "border-[var(--bn-status-danger)]/35 bg-[var(--bn-status-danger)]/10";
    case "attention":
      return "border-amber-500/30 bg-amber-500/10";
    case "positive":
      return "border-[var(--bn-status-ok)]/30 bg-[var(--bn-status-ok)]/10";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function toneIconClass(tone: MorningBriefingTone): string {
  switch (tone) {
    case "urgent":
      return "text-[var(--bn-status-danger)]";
    case "attention":
      return "text-amber-300";
    case "positive":
      return "text-[var(--bn-status-ok)]";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function CardLink({ card }: { card: MorningBriefingCard }) {
  const Icon = kindIcon(card.kind);
  return (
    <Link
      href={card.href}
      className={cn(
        "group flex flex-col gap-2 rounded-xl border p-4 transition hover:opacity-95",
        toneClasses(card.tone),
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bn-surface)]/60",
            toneIconClass(card.tone),
          )}
        >
          {card.tone === "urgent" ? (
            <AlertTriangle className="size-4" aria-hidden />
          ) : (
            <Icon className="size-4" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-[var(--bn-on)]">
            {card.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--bn-muted)]">
            {card.detail}
          </p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--bn-primary)]">
        {card.cta}
        <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export function AdminMorningBriefingPanel({
  briefing,
  aiEnabled = false,
}: Props) {
  return (
    <section
      aria-label="Briefing matinal"
      className="rounded-2xl border border-[var(--bn-border)] bg-[var(--bn-surface-elevated)] p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-wide text-[var(--bn-muted)] uppercase">
            Ritual do dia
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--bn-on)] sm:text-xl">
            {briefing.greeting}
          </h2>
          <p className="mt-1 text-sm text-[var(--bn-muted)]">
            {briefing.subtitle}
          </p>
        </div>
        <Link
          href="/admin/operacional"
          className="shrink-0 text-xs font-medium text-[var(--bn-primary)] hover:underline"
        >
          Ver operacional →
        </Link>
      </div>

      {briefing.cards.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {briefing.cards.map((card) => (
            <CardLink key={card.id} card={card} />
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-[var(--bn-status-ok)]/25 bg-[var(--bn-status-ok)]/10 px-4 py-3 text-sm text-[var(--bn-on)]">
          Nada urgente na fila. Bom momento para revisar marca, equipe ou o site.
        </p>
      )}

      {aiEnabled ? (
        <AdminMorningBriefingAi facts={briefing.facts} />
      ) : null}
    </section>
  );
}
