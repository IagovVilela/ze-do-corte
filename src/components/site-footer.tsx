"use client";

import { motion, useReducedMotion } from "framer-motion";

import { BrandLogo } from "@/components/brand-logo";
import { InstagramIcon, WhatsappIcon } from "@/components/icons";
import { BARBER_SLOGAN_SECONDARY } from "@/lib/constants";
import {
  getInstagramContactHref,
  getWhatsappContactHref,
} from "@/lib/contact-links";

type SiteFooterProps = {
  showPitch?: boolean;
  brandName?: string;
  pitch?: string;
  logoUrl?: string | null;
  whatsappHref?: string | null;
  instagramHref?: string | null;
};

export function SiteFooter({
  showPitch = true,
  brandName = "Zé do Corte",
  pitch,
  logoUrl,
  whatsappHref,
  instagramHref,
}: SiteFooterProps) {
  const reduceMotion = useReducedMotion();
  const wa = whatsappHref?.trim() || getWhatsappContactHref();
  const ig = instagramHref?.trim() || getInstagramContactHref();
  const pitchText = pitch?.trim() || BARBER_SLOGAN_SECONDARY;
  const linkClass =
    "inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-brand-500/35 hover:text-white";

  return (
    <motion.footer
      initial={reduceMotion ? false : { opacity: 0, y: 28, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px", amount: 0.3 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 76, damping: 20, mass: 0.9 }
      }
      className="border-t border-white/10 py-8"
    >
      <div className="container-max flex flex-col gap-4 text-center text-sm text-zinc-400 md:flex-row md:items-center md:justify-between md:text-left">
        <motion.div
          className="flex flex-col items-center gap-3 md:flex-row md:items-center md:gap-4"
          whileHover={reduceMotion ? undefined : { x: 2 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          <BrandLogo size={48} className="h-12 w-12" src={logoUrl} />
          <p>
            © {new Date().getFullYear()} {brandName}. Todos os direitos reservados.
          </p>
        </motion.div>
        <div className="flex flex-col items-center gap-3 md:items-end">
          {showPitch ? <p className="max-w-sm text-zinc-500">{pitchText}</p> : null}
          {(wa || ig) && (
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
              {wa ? (
                <a href={wa} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  <WhatsappIcon className="h-4 w-4" aria-hidden />
                  WhatsApp
                </a>
              ) : null}
              {ig ? (
                <a href={ig} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  <InstagramIcon className="h-4 w-4" aria-hidden />
                  Instagram
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </motion.footer>
  );
}
