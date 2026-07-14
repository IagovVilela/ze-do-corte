"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Scissors } from "lucide-react";

/**
 * Emblema do hero — anéis orbitais + ícone de ofício (tesoura + agenda),
 * no lugar da esfera genérica do Stitch.
 */
export function HeroOrb() {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-80 lg:justify-end lg:pr-[6%]"
    >
      <motion.div
        className="relative size-[min(420px,72vw)]"
        animate={
          reduce
            ? undefined
            : {
                y: [0, -12, 0],
              }
        }
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* anéis */}
        <motion.div
          className="absolute inset-0 rounded-full border border-dashed border-[#3b82f6]/35"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-[10%] rounded-full border border-[#8eb6ff]/25 shadow-[0_0_90px_-16px_rgba(59,130,246,0.55)]" />
        <div className="absolute inset-[22%] rounded-full border border-white/15 bg-[radial-gradient(circle_at_30%_25%,rgba(59,130,246,0.22),transparent_70%)]" />

        {/* núcleo: oficio + agenda */}
        <div className="absolute inset-[30%] flex items-center justify-center">
          <div className="relative flex size-full items-center justify-center rounded-full border border-[#8eb6ff]/40 bg-[#0a0e13]/75 shadow-[inset_0_0_40px_rgba(59,130,246,0.2)] backdrop-blur-md">
            <Scissors
              className="size-[42%] -rotate-45 text-[#8eb6ff]"
              strokeWidth={1.25}
            />
            <motion.div
              className="absolute -right-1 -bottom-1 flex size-12 items-center justify-center rounded-2xl border border-[#3b82f6]/50 bg-[#1e2733] text-[#8eb6ff] shadow-[0_8px_28px_-8px_rgba(59,130,246,0.7)] md:size-14"
              animate={reduce ? undefined : { y: [0, -4, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <CalendarDays className="size-6 md:size-7" strokeWidth={1.5} />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
