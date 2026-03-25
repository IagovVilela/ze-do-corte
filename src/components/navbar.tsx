"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Scissors } from "lucide-react";

const links = [
  { href: "/", label: "Início" },
  { href: "/#servicos", label: "Serviços" },
  { href: "/#contato", label: "Contato" },
  { href: "/agendar", label: "Agendar" },
  { href: "/admin", label: "Admin" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-brand-950/80 backdrop-blur-xl">
      <div className="container-max flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-wide">
          <Scissors className="h-4 w-4 text-brand-300" />
          <span>Zé do Corte</span>
        </Link>
        <nav className="flex items-center gap-2 md:gap-4">
          {links.map((link) => (
            <motion.div
              key={link.href}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.18 }}
            >
              <Link
                href={link.href}
                className="rounded-full px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            </motion.div>
          ))}
        </nav>
      </div>
    </header>
  );
}
