"use client";

import { motion, useReducedMotion } from "framer-motion";

import { staggerItem } from "@/lib/motion-presets";
import type { ServiceSummary } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";

type ServiceCardProps = {
  service: ServiceSummary;
  /** Usa tokens do tema do canvas (`--site-*` / `--color-brand-*`). */
  themed?: boolean;
};

export function ServiceCard({ service, themed = false }: ServiceCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      variants={staggerItem}
      whileHover={
        reduceMotion
          ? undefined
          : { y: -8, scale: 1.015, transition: { type: "spring", stiffness: 300, damping: 22 } }
      }
      className={cn(
        "rounded-2xl p-6",
        themed ? "border" : "glass-card",
      )}
      style={
        themed
          ? {
              backgroundColor: "var(--site-surface)",
              borderColor:
                "color-mix(in srgb, var(--site-text) 14%, transparent)",
              color: "var(--site-text)",
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-4">
        <h3
          className={cn("text-xl font-semibold", !themed && "text-zinc-50")}
          style={themed ? { color: "var(--site-text)" } : undefined}
        >
          {service.name}
        </h3>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium",
            !themed &&
              "border border-brand-600/60 bg-brand-surface-20 text-brand-300",
          )}
          style={
            themed
              ? {
                  backgroundColor: "var(--color-brand-500)",
                  color: "var(--site-on-primary)",
                }
              : undefined
          }
        >
          {service.durationMinutes} min
        </span>
      </div>
      <p
        className={cn("mt-3 text-sm", !themed && "text-zinc-300")}
        style={
          themed
            ? {
                color: "color-mix(in srgb, var(--site-text) 72%, transparent)",
              }
            : undefined
        }
      >
        {service.description}
      </p>
      <p
        className={cn("mt-5 text-lg font-semibold", !themed && "text-brand-300")}
        style={themed ? { color: "var(--color-brand-400)" } : undefined}
      >
        {formatMoney(service.price)}
      </p>
    </motion.article>
  );
}
