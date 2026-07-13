import { NavbarChrome, NavbarPainelTrailing } from "./navbar-client";

export type NavbarBrandProps = {
  brandName?: string;
  logoUrl?: string | null;
  homeHref?: string;
  bookHref?: string;
  whatsappHref?: string | null;
  instagramHref?: string | null;
};

export function Navbar(props: NavbarBrandProps = {}) {
  return (
    <NavbarChrome
      brandName={props.brandName}
      logoUrl={props.logoUrl}
      homeHref={props.homeHref}
      bookHref={props.bookHref}
      whatsappHref={props.whatsappHref}
      instagramHref={props.instagramHref}
      trailing={<NavbarPainelTrailing />}
    />
  );
}
