import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ size = 40, className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/images/logo.jpeg"
      alt="Zé do Corte — Barbearia"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 rounded-lg object-contain ring-1 ring-white/10", className)}
    />
  );
}
