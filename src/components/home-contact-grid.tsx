"use client";

import { motion } from "framer-motion";

import { ContactCard } from "@/components/contact-card";
import { ContactVisitPanel } from "@/components/contact-visit-panel";
import { LocationMap } from "@/components/location-map";
import { StaggerReveal } from "@/components/motion-stagger";
import { staggerItem } from "@/lib/motion-presets";
import { BARBER_SHOP_ADDRESS } from "@/lib/constants";

export function HomeContactGrid() {
  return (
    <StaggerReveal className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-stretch" stagger={0.14}>
      <motion.div variants={staggerItem} className="flex flex-col gap-4">
        <ContactCard title="Localização" subtitle={BARBER_SHOP_ADDRESS} />
        <LocationMap />
      </motion.div>
      <motion.div variants={staggerItem} className="min-h-0">
        <ContactVisitPanel />
      </motion.div>
    </StaggerReveal>
  );
}
