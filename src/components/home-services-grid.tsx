"use client";

import { motion } from "framer-motion";

import { DatabaseUnavailableNotice } from "@/components/database-unavailable-notice";
import { ServiceCard } from "@/components/service-card";
import { StaggerReveal } from "@/components/motion-stagger";
import { staggerItem } from "@/lib/motion-presets";
import type { ServiceSummary } from "@/lib/types";

type Props = {
  services: ServiceSummary[];
  gridCols?: 1 | 2 | 3;
  /** Cartões seguem a paleta do canvas (Principal / Texto / Superfície). */
  themed?: boolean;
};

export function HomeServicesGrid({
  services,
  gridCols = 3,
  themed = false,
}: Props) {
  if (services.length === 0) {
    return (
      <motion.div
        className="mt-10 max-w-2xl"
        variants={staggerItem}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
      >
        <DatabaseUnavailableNotice />
      </motion.div>
    );
  }

  const cols =
    gridCols === 1
      ? "mt-10 grid gap-6"
      : gridCols === 2
        ? "mt-10 grid gap-6 md:grid-cols-2"
        : "mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3";

  return (
    <StaggerReveal className={cols} stagger={0.11}>
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} themed={themed} />
      ))}
    </StaggerReveal>
  );
}
