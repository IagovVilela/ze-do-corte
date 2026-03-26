import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { isClerkConfigured } from "@/lib/clerk-config";

export default function SignInPage() {
  if (!isClerkConfigured()) {
    redirect("/");
  }

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">
        <div className="container-max flex min-h-[65vh] flex-col items-center justify-center py-16">
          <SignIn
            fallbackRedirectUrl="/"
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "glass-card border border-white/10 bg-zinc-900/90 shadow-none",
              },
            }}
          />
        </div>
      </main>
      <SiteFooter showPitch={false} />
    </>
  );
}
