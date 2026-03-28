"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

import { StaggerReveal } from "@/components/motion-stagger";
import {
  getBarberCardLayout,
  getBarberCardTheme,
} from "@/lib/barber-card-theme";
import { staggerItem } from "@/lib/motion-presets";
import type { PublicBarber } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  barbers: PublicBarber[];
};

export function HomeBarbersGrid({ barbers }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <StaggerReveal
      className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7"
      stagger={0.12}
    >
      {barbers.map((barber) => {
        const theme = getBarberCardTheme(barber.id);
        const layout = getBarberCardLayout(barber.id);

        const isWide = layout === 2;
        const isSquare = layout === 1;
        const badgeLabel =
          barber.name.trim().split(/\s+/)[0]?.slice(0, 14) || "Equipe";

        return (
          <motion.article
            key={barber.id}
            variants={staggerItem}
            whileHover={
              reduceMotion
                ? undefined
                : {
                    y: -6,
                    scale: 1.02,
                    transition: { type: "spring", stiffness: 280, damping: 22 },
                  }
            }
            className={cn(
              "glass-card group flex flex-col overflow-hidden rounded-2xl ring-1 ring-inset transition-shadow duration-300",
              theme.ring,
              isWide && "lg:col-span-2 lg:flex-row lg:items-stretch",
            )}
          >
            <div
              className={cn(
                "relative w-full shrink-0 bg-gradient-to-b from-zinc-800/80 to-zinc-950/90",
                isSquare ? "aspect-square sm:aspect-[5/4]" : "aspect-[4/3]",
                isWide && "lg:aspect-auto lg:min-h-[280px] lg:w-[42%] lg:max-w-md",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90",
                  theme.imageWash,
                )}
              />
              {barber.imageUrl ? (
                <Image
                  src={barber.imageUrl}
                  alt=""
                  fill
                  className={cn(
                    "object-cover object-center transition duration-500 group-hover:scale-[1.03]",
                    isSquare && "object-[center_20%]",
                  )}
                  sizes={
                    isWide
                      ? "(max-width: 1024px) 100vw, 42vw"
                      : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  }
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span
                    className={cn(
                      "flex size-24 items-center justify-center rounded-full text-3xl font-semibold ring-2",
                      theme.chip,
                    )}
                  >
                    {barber.name.slice(0, 1).toUpperCase()}
                  </span>
                </div>
              )}
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t to-transparent",
                  theme.imageFade,
                )}
              />
              <span
                className={cn(
                  "absolute left-4 top-4 max-w-[min(100%-2rem,12rem)] truncate rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1 backdrop-blur-sm",
                  theme.chip,
                )}
              >
                {badgeLabel}
              </span>
            </div>

            <div
              className={cn(
                "relative flex flex-1 flex-col p-6 pt-5",
                isWide && "lg:justify-center lg:py-8 lg:pl-8 lg:pr-10",
              )}
            >
              <div
                className={cn(
                  "mb-3 h-1 rounded-full bg-gradient-to-r",
                  theme.bar,
                  layout === 0 ? "w-10" : "w-14",
                )}
              />
              <h3
                className={cn(
                  "font-display text-xl font-semibold tracking-tight",
                  theme.accentText,
                )}
              >
                {barber.name}
              </h3>
              {barber.bio ? (
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {barber.bio}
                </p>
              ) : (
                <p className="mt-3 text-sm italic text-zinc-600">
                  Profissional da equipe Zé do Corte.
                </p>
              )}
            </div>
          </motion.article>
        );
      })}
    </StaggerReveal>
  );
}
