import { Syne } from "next/font/google";

import { BarbernegonLanding } from "@/components/barbernegon-landing";

const landingDisplay = Syne({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-landing-display",
});

export const metadata = {
  title: "Barbernegon | Sua barbearia, sua cara",
  description:
    "Plataforma para barbearias: site com identidade forte, agendamento online, admin, caixa e clube de assinaturas — sem burocracia.",
};

export default function BarbernegonLandingPage() {
  return (
    <div className={landingDisplay.variable}>
      <BarbernegonLanding />
    </div>
  );
}
