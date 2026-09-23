import type { Metadata } from "next";
import { Geist, Montserrat } from "next/font/google";

import { VagaPerdidaLanding } from "@/components/vaga-perdida-landing";

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
  title: "Vaga Perdida | Barbernegon",
  description:
    "Guia prático: descubra quanto a vaga perdida está tirando do caixa da sua barbearia — diagnóstico, scripts e checklist em 7 dias.",
  robots: { index: false, follow: false },
};

export default function VagaPerdidaPage() {
  return (
    <VagaPerdidaLanding
      className={`${body.variable} ${headline.variable} font-[family-name:var(--font-auth-body)]`}
    />
  );
}
