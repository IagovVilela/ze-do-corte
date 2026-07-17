import { Montserrat } from "next/font/google";

const exploreHeadline = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-explore-headline",
  display: "swap",
});

/** Layout do marketplace: tipografia Montserrat (Onyx & Azure). */
export default function ExplorarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={exploreHeadline.variable}>{children}</div>;
}
