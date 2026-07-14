"use client";

import { motion } from "framer-motion";

import { ContactCard } from "@/components/contact-card";
import {
  ContactVisitPanel,
  type ContactScheduleRow,
} from "@/components/contact-visit-panel";
import { LocationMap } from "@/components/location-map";
import { StaggerReveal } from "@/components/motion-stagger";
import { staggerItem } from "@/lib/motion-presets";

type UnitInfo = {
  id: string;
  name: string;
  addressLine: string | null;
  city: string | null;
  isDefault: boolean;
};

type Props = {
  units: UnitInfo[];
  bookHref?: string;
  shopName?: string;
  sloganPrimary?: string | null;
  sloganSecondary?: string | null;
  phoneLabel?: string | null;
  whatsappHref?: string | null;
  instagramHref?: string | null;
  schedule?: ContactScheduleRow[] | null;
  gridCols?: 1 | 2 | 3;
};

export function HomeContactGrid({
  units,
  bookHref = "/agendar",
  shopName,
  sloganPrimary,
  sloganSecondary,
  phoneLabel,
  whatsappHref,
  instagramHref,
  schedule,
  gridCols = 2,
}: Props) {
  const displayUnits =
    units.length > 0
      ? units
      : [
          {
            id: "empty",
            name: shopName?.trim() || "Unidade",
            addressLine: null as string | null,
            city: null as string | null,
            isDefault: true,
          },
        ];

  const gridClass =
    gridCols === 1
      ? "grid gap-8"
      : gridCols === 3
        ? "grid gap-8 lg:grid-cols-3 lg:items-stretch"
        : "grid gap-8 lg:grid-cols-2 lg:items-stretch";

  return (
    <div className="mt-8 flex flex-col gap-12">
      {[...displayUnits]
        .sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1))
        .map((u, i) => {
          const address = [u.addressLine, u.city].filter(Boolean).join(", ");
          const hasAddress = Boolean(address);
          const telDigits = phoneLabel?.replace(/\D/g, "") || null;

          return (
            <StaggerReveal key={u.id} className={gridClass} stagger={0.14}>
              <motion.div variants={staggerItem} className="flex flex-col gap-4">
                <ContactCard
                  title={
                    displayUnits.length > 1 ? `Localização - ${u.name}` : "Localização"
                  }
                  subtitle={
                    hasAddress
                      ? address
                      : "Endereço ainda não configurado — edite a unidade no painel."
                  }
                />
                {hasAddress ? <LocationMap query={address} mapTitle={u.name} /> : null}
              </motion.div>
              <motion.div variants={staggerItem} className="min-h-0">
                {i === 0 ? (
                  <ContactVisitPanel
                    bookHref={bookHref}
                    sloganPrimary={sloganPrimary}
                    sloganSecondary={sloganSecondary}
                    phoneLabel={phoneLabel}
                    phoneHref={telDigits ? `tel:+${telDigits}` : null}
                    whatsappHref={whatsappHref}
                    instagramHref={instagramHref}
                    schedule={schedule}
                  />
                ) : null}
              </motion.div>
            </StaggerReveal>
          );
        })}
    </div>
  );
}
