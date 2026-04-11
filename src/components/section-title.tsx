"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { AnimatedText } from "@/components/animated-text";

import {
  fadeUpSmall,
  scaleInLine,
  staggerContainer,
} from "@/lib/motion-presets";

type SectionTitleProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  subtitle?: string;
  center?: boolean;
};


export function SectionTitle({
  eyebrow,
  title,
  description,
  subtitle,
  center = false,
}: SectionTitleProps) {
  const reduceMotion = useReducedMotion();
  const content = description ?? subtitle;

  if (reduceMotion) {
    return (
      <div className={center ? "text-center" : ""}>
        {eyebrow ? (
          <span className="mb-4 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-brand-300">
            {eyebrow}
          </span>
        ) : null}
        <h2 className="font-display text-3xl font-normal uppercase leading-[1.05] tracking-wide text-white sm:text-4xl md:text-5xl">
          {title}
        </h2>
        {content ? <p className="mt-4 max-w-2xl text-zinc-400 sm:text-lg">{content}</p> : null}
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.32 }}
      variants={staggerContainer(0.1, 0.05)}
      className={center ? "text-center" : ""}
    >
      {eyebrow ? (
        <motion.span
          variants={fadeUpSmall}
          className="mb-4 inline-flex origin-left rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-brand-300"
        >
          {eyebrow}
        </motion.span>
      ) : null}

      {typeof title === "string" ? (
        <motion.h2
          className="font-display text-3xl font-normal uppercase leading-[1.12] tracking-wide text-white sm:text-4xl md:text-5xl"
          variants={fadeUpSmall}
        >
          <AnimatedText
            variant="reveal"
            className="font-display uppercase tracking-wide"
          >
            {title}
          </AnimatedText>
        </motion.h2>
      ) : (
        <motion.h2
          variants={fadeUpSmall}
          className="font-display text-3xl font-normal uppercase leading-[1.05] tracking-wide text-white sm:text-4xl md:text-5xl"
        >
          {title}
        </motion.h2>
      )}

      {content ? (
        <motion.div
          variants={fadeUpSmall}
          className={`mt-4 max-w-2xl ${center ? "mx-auto" : ""}`}
        >
          <p className="text-zinc-400 sm:text-lg">{content}</p>
          <motion.span
            aria-hidden
            className={`mt-6 block h-px max-w-md bg-gradient-to-r from-brand-500/70 via-white/20 to-transparent ${center ? "mx-auto" : ""}`}
            variants={scaleInLine}
            style={{ transformOrigin: center ? "center" : "left" }}
          />
        </motion.div>
      ) : null}
    </motion.div>
  );
}
