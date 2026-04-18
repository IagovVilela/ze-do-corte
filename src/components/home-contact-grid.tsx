"use client";

import { motion } from "framer-motion";

import { ContactCard } from "@/components/contact-card";
import { ContactVisitPanel } from "@/components/contact-visit-panel";
import { LocationMap } from "@/components/location-map";
import { StaggerReveal } from "@/components/motion-stagger";
import { staggerItem } from "@/lib/motion-presets";
import { BARBER_SHOP_ADDRESS } from "@/lib/constants";

type UnitInfo = {
  id: string;
  name: string;
  addressLine: string | null;
  city: string | null;
  isDefault: boolean;
};

type Props = {
  units: UnitInfo[];
};

export function HomeContactGrid({ units }: Props) {
  const fallbackAddress = typeof BARBER_SHOP_ADDRESS === "string" ? BARBER_SHOP_ADDRESS : "";
  const displayUnits = units.length > 0 ? units : [{
    id: "fallback",
    name: "Unidade Principal",
    addressLine: fallbackAddress,
    city: null,
    isDefault: true,
  }];

  return (
    <div className="mt-8 flex flex-col gap-12">
      {[...displayUnits].sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1)).map((u, i) => {
        let address = fallbackAddress;
        if (u.addressLine || u.city) {
          // If it's the default unit and has no specific address line in DB, fallback to the full constant address
          if (u.isDefault && !u.addressLine) {
            address = fallbackAddress;
          } else {
            address = [u.addressLine, u.city].filter(Boolean).join(", ");
          }
        }
        
        return (
          <StaggerReveal key={u.id} className="grid gap-8 lg:grid-cols-2 lg:items-stretch" stagger={0.14}>
            <motion.div variants={staggerItem} className="flex flex-col gap-4">
              <ContactCard title={units.length > 1 ? `Localização - ${u.name}` : "Localização"} subtitle={address} />
              <LocationMap query={address} />
            </motion.div>
            <motion.div variants={staggerItem} className="min-h-0">
              {i === 0 && <ContactVisitPanel />}
            </motion.div>
          </StaggerReveal>
        );
      })}
    </div>
  );
}
