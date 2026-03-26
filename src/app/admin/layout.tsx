import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getPrimaryEmail, isAdminUser } from "@/lib/admin-auth";
import { isClerkConfigured } from "@/lib/clerk-config";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!isClerkConfigured()) {
    if (process.env.NODE_ENV === "production") {
      redirect("/");
    }
    return (
      <>
        <div className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-100">
          Modo local: Clerk não configurado — o painel está aberto sem login. Configure{" "}
          <code className="rounded bg-black/20 px-1">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> em
          produção.
        </div>
        {children}
      </>
    );
  }

  const user = await currentUser();
  const email = getPrimaryEmail(user);
  if (!isAdminUser(email)) {
    redirect("/");
  }
  return children;
}
