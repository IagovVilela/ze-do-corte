import type { Metadata } from "next";
import { Bebas_Neue, Geist, Geist_Mono } from "next/font/google";

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
  title: "Barbernegon | Sua barbearia, sua cara",
  description:
    "Plataforma para barbearias: site com identidade forte, agendamento online, admin, caixa e clube de assinaturas — sem burocracia.",
  icons: {
    icon: [{ url: "/images/barbernegon-logo.png", type: "image/png" }],
    apple: "/images/barbernegon-logo.png",
    shortcut: "/images/barbernegon-logo.png",
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
