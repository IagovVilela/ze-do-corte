"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

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
  const content = description ?? subtitle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.5 }}
      className={center ? "text-center" : ""}
    >
      {eyebrow ? (
        <span className="mb-4 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.22em] text-brand-300">
          {eyebrow}
        </span>
      ) : null}

      <h2 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
        {title}
      </h2>

      {content ? (
        <p className="mt-4 max-w-2xl text-zinc-400 sm:text-lg">{content}</p>
      ) : null}
    </motion.div>
  );
}
