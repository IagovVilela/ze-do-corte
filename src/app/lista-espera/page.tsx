import type { Metadata } from "next";
import { Geist, Montserrat } from "next/font/google";

import { ListaEsperaForm } from "@/components/lista-espera-form";

const body = Geist({
  subsets: ["latin"],
  variable: "--font-auth-body",
  display: "swap",
});

const headline = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-auth-headline",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lista de interesse | Barbernegon",
  description:
    "Deixe seus dados para falar com a Barbernegon sobre o site e a agenda da sua barbearia.",
  robots: { index: false, follow: false },
};

export default function ListaEsperaPage() {
  return (
    <ListaEsperaForm
      className={`${body.variable} ${headline.variable} font-[family-name:var(--font-auth-body)]`}
    />
  );
}
