"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ServiceSummary } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

import { staggerItem } from "@/lib/motion-presets";

type ServiceCardProps = {
  service: ServiceSummary;
};

export function ServiceCard({ service }: ServiceCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      variants={staggerItem}
      whileHover={
        reduceMotion
          ? undefined
          : { y: -8, scale: 1.015, transition: { type: "spring", stiffness: 300, damping: 22 } }
      }
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-semibold text-zinc-50">{service.name}</h3>
        <span className="rounded-full border border-brand-600/60 bg-brand-surface-20 px-3 py-1 text-sm text-brand-300">
          {service.durationMinutes} min
        </span>
      </div>
      <p className="mt-3 text-sm text-zinc-300">{service.description}</p>
      <p className="mt-5 text-lg font-semibold text-brand-300">
        {formatMoney(service.price)}
      </p>
    </motion.article>
  );
}
