import type { Metadata } from "next";
import { Bebas_Neue, Geist, Geist_Mono } from "next/font/google";

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
    icon: [{ url: "/images/logo.jpeg", type: "image/jpeg" }],
    apple: "/images/logo.jpeg",
    shortcut: "/images/logo.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-clip bg-brand-950 text-zinc-100">
        {children}
      </body>
    </html>
  );
}
