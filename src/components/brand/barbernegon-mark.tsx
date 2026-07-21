import Link from "next/link";

import { cn } from "@/lib/utils";

export const BARBERNEGON_LOGO_SRC = "/images/barbernegon-logo.png?v=2";

type BarbernegonMarkProps = {
  href?: string;
  /** Altura do selo em px (largura acompanha). */
  size?: number;
  /** Mostra o nome ao lado do selo. */
  withWordmark?: boolean;
  className?: string;
  priority?: boolean;
};

/**
 * Marca da plataforma Barbernegon — selo circular (sem fundo preto quadrado) + wordmark.
 */
export function BarbernegonMark({
  href = "/",
  size = 44,
  withWordmark = true,
  className,
  priority = false,
}: BarbernegonMarkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-90",
        className,
      )}
      aria-label="Barbernegon"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BARBERNEGON_LOGO_SRC}
        alt=""
        width={size}
        height={size}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        className="block shrink-0 rounded-full object-contain"
        style={{ width: size, height: size }}
      />
      {withWordmark ? (
        <span className="font-brand-headline truncate text-lg font-bold tracking-tight text-inherit sm:text-xl md:text-2xl">
          Barbernegon
        </span>
      ) : null}
    </Link>
  );
}
