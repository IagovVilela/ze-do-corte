import { Geist, Montserrat } from "next/font/google";

import { CadastroClient } from "@/components/auth/cadastro-client";

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

export const metadata = {
  title: "Crie sua barbearia | Barbernegon",
  description:
    "Em minutos: site próprio, agendamento e painel — sem burocracia.",
};

export default function CadastroPage() {
  return (
    <CadastroClient
      className={`${body.variable} ${headline.variable} font-[family-name:var(--font-auth-body)]`}
    />
  );
}
