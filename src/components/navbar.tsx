import { isClerkConfigured } from "@/lib/clerk-config";

import { NavbarClient } from "./navbar-client";

export function Navbar() {
  return <NavbarClient clerkEnabled={isClerkConfigured()} />;
}
