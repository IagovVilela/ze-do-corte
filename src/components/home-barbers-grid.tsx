"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

import { StaggerReveal } from "@/components/motion-stagger";
import { staggerItem } from "@/lib/motion-presets";
import type { PublicBarber } from "@/lib/types";

type Props = {
  barbers: PublicBarber[];
};

export function HomeBarbersGrid({ barbers }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <StaggerReveal className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger={0.12}>
      {barbers.map((barber) => (
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
          className="glass-card flex flex-col overflow-hidden rounded-2xl"
        >
          <div className="relative aspect-[4/3] w-full bg-gradient-to-b from-zinc-800/80 to-zinc-950/90">
            {barber.imageUrl ? (
              <Image
                src={barber.imageUrl}
                alt=""
                fill
                className="object-cover object-center"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="flex size-24 items-center justify-center rounded-full bg-brand-500/20 text-3xl font-semibold text-brand-200 ring-2 ring-brand-500/35">
                  {barber.name.slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-950/95 to-transparent" />
          </div>
          <div className="flex flex-1 flex-col p-6 pt-5">
            <h3 className="font-display text-xl font-semibold tracking-tight text-zinc-50">
              {barber.name}
            </h3>
            {barber.bio ? (
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{barber.bio}</p>
            ) : (
              <p className="mt-3 text-sm italic text-zinc-600">
                Profissional da equipe Zé do Corte.
              </p>
            )}
          </div>
        </motion.article>
      ))}
    </StaggerReveal>
  );
}
