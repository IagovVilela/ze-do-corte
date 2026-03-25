"use client";

import { motion } from "framer-motion";
import type { ServiceSummary } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

type ServiceCardProps = {
  service: ServiceSummary;
};

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <motion.article
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-semibold text-zinc-50">{service.name}</h3>
        <span className="rounded-full border border-brand-500/50 bg-brand-500/20 px-3 py-1 text-sm text-brand-300">
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
