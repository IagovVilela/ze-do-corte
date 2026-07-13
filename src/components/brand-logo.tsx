import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
  src?: string | null;
  alt?: string;
};

/**
 * Logo da marca — default em `public/images/logo.jpeg` ou URL do tenant.
 */
export function BrandLogo({
  size = 40,
  className,
  priority = false,
  src,
  alt = "",
}: BrandLogoProps) {
  const imageSrc = src?.trim() || "/images/logo.jpeg";
  return (
    // eslint-disable-next-line @next/next/no-img-element -- asset estático ou URL remota do tenant
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
