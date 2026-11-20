import { CircleUser, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getWarehouses } from "@/lib/queries/settings";
import { CartCount } from "./cart-widgets";
import { MobileMenu } from "./MobileMenu";
import { SearchDialog } from "./SearchDialog";

/** Home page floating pill header (live classes: landing-header, primary-nav, header-utilities). */
export async function LandingHeader() {
  const warehouses = (await getWarehouses()).map((w) => ({ code: w.code, name: w.name, tagline: w.tagline }));

  return (
    <header className="landing-header">
      <nav className="mobile-header-controls" aria-label="Mobile">
        <MobileMenu warehouses={warehouses} buttonClassName="header-icon-button" />
        <SearchDialog variant="landing" buttonClassName="header-icon-button" />
      </nav>
      <Link href="/" className="landing-brand" aria-label="LPPEPTIDE home">
        <Image src="/brand/lppeptide-logo-center.png" alt="LPPEPTIDE" width={44} height={44} priority />
        <strong>LPPEPTIDE</strong>
      </Link>
      <nav className="primary-nav" aria-label="Primary">
        {warehouses.map((w) => (
          <Link key={w.code} href={`/warehouse/${w.code.toLowerCase()}/`} className="warehouse-nav-link">
            <span>{w.name}</span>
            <small>{w.tagline}</small>
          </Link>
        ))}
        <Link href="/affiliate-program/">Affiliate</Link>
        <Link href="/coa/">COA</Link>
      </nav>
      <nav className="header-utilities" aria-label="Account and cart">
        <SearchDialog variant="landing" buttonClassName="header-icon-button desktop-search-button" />
        <Link href="/login/" className="header-icon-button" aria-label="Account">
          <CircleUser size={22} aria-hidden="true" />
        </Link>
        <Link href="/cart/" className="header-icon-button cart-icon-button" aria-label="Cart">
          <ShoppingCart size={22} aria-hidden="true" />
          <CartCount hideWhenEmpty />
        </Link>
      </nav>
    </header>
  );
}
