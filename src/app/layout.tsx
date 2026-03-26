import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Bebas_Neue, Geist, Geist_Mono } from "next/font/google";

import { isClerkConfigured } from "@/lib/clerk-config";
import { BARBER_SLOGAN_PRIMARY, BARBER_SLOGAN_SECONDARY } from "@/lib/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: `Zé do Corte | ${BARBER_SLOGAN_PRIMARY}`,
  description: `${BARBER_SLOGAN_PRIMARY}. ${BARBER_SLOGAN_SECONDARY} Agendamento online em São José dos Campos.`,
  icons: {
    icon: "/images/logo.jpeg",
    apple: "/images/logo.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const htmlShell = (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-brand-950 text-zinc-100">
        {children}
      </body>
    </html>
  );

  if (!isClerkConfigured()) {
    return htmlShell;
  }

  return <ClerkProvider>{htmlShell}</ClerkProvider>;
}
