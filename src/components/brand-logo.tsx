import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

/**
 * Marca em `public/images/logo.jpeg` — `<img>` nativo (evita edge cases do otimizador com certos assets).
 */
export function BrandLogo({ size = 40, className, priority = false }: BrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- asset estático em public/
    <img
      src="/images/logo.jpeg"
      alt=""
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={cn(
        "shrink-0 rounded-xl object-contain object-center ring-1 ring-white/15",
        className,
      )}
      aria-hidden
    />
  );
}
