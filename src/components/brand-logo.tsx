import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  src?: string | null;
  alt?: string;
  /** Inicial(ais) neutras quando não há logo — nunca cai no asset piloto. */
  fallbackLabel?: string;
};

/**
 * Logo do tenant. Sem `src`, mostra placeholder neutro (não usa logo.jpeg da Zé).
 */
export function BrandLogo({
  size = 40,
  className,
  priority = false,
  src,
  alt = "",
  fallbackLabel,
}: BrandLogoProps) {
  const imageSrc = src?.trim() || null;
  if (!imageSrc) {
    const letter = (fallbackLabel?.trim() || alt.trim() || "?").charAt(0).toUpperCase();
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-xl bg-white/10 font-display font-semibold text-brand-200 ring-1 ring-white/15",
          className,
        )}
        style={{ width: size, height: size, fontSize: Math.max(12, size * 0.4) }}
        aria-hidden={alt ? undefined : true}
        aria-label={alt || undefined}
      >
        {letter}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL remota do tenant
    <img
      src={imageSrc}
      alt={alt}
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={cn(
        "shrink-0 rounded-xl object-contain object-center ring-1 ring-white/15",
        className,
      )}
      aria-hidden={alt ? undefined : true}
    />
  );
}
