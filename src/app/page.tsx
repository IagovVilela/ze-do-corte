import { Geist, JetBrains_Mono } from "next/font/google";

import { BarbernegonLanding } from "@/components/landing/barbernegon-landing";

const body = Geist({
  subsets: ["latin"],
  variable: "--font-ln-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-ln-mono",
  display: "swap",
});

export const metadata = {
  title: "Barbernegon | Sua barbearia, sua cara",
  description:
    "Esqueça os marketplaces genéricos. Sistema próprio de agendamentos com a identidade da sua marca.",
};

export default function BarbernegonLandingPage() {
  return (
    <BarbernegonLanding className={`${body.variable} ${mono.variable}`} />
  );
}
