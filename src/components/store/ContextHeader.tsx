import { CircleUser, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getWarehouses } from "@/lib/queries/settings";
import { AnnouncementBar } from "./AnnouncementBar";
import { CartCount } from "./cart-widgets";
import { ContextMenu, NavLink } from "./ContextNav";
import { SearchDialog } from "./SearchDialog";

/** Header for every page except home (live classes: storefront-context-*). */
export async function ContextHeader() {
  const warehouses = (await getWarehouses()).map((w) => ({
    code: w.code,
    name: w.name,
    tagline: w.tagline,
    href: `/warehouse/${w.code.toLowerCase()}/`,
  }));

  return (
    <div className="storefront-context-header">
      <AnnouncementBar variant="context" />
      <header className="storefront-context-main">
        <ContextMenu warehouses={warehouses} />
        <Link href="/" className="storefront-context-brand" aria-label="LPPEPTIDE home">
          <Image src="/brand/lppeptide-logo-center.png" alt="LPPEPTIDE" width={38} height={38} priority />
          <strong>LPPEPTIDE</strong>
        </Link>
        <nav className="storefront-context-primary" aria-label="Warehouse and company navigation">
          {warehouses.map((w) => (
            <NavLink key={w.code} href={w.href} className="storefront-context-warehouse-link">
              <span>{w.name}</span>
              <small>{w.tagline}</small>
            </NavLink>
          ))}
          <NavLink href="/affiliate-program/">Affiliate</NavLink>
          <NavLink href="/coa/">COA</NavLink>
        </nav>
        <nav className="storefront-context-tools" aria-label="Account tools">
          <SearchDialog variant="context" />
          <Link href="/login/" aria-label="Sign in">
            <CircleUser size={22} aria-hidden="true" />
          </Link>
          <Link href="/cart/" className="storefront-context-cart" aria-label="Shopping cart">
            <ShoppingCart size={22} aria-hidden="true" />
            <CartCount hideWhenEmpty />
          </Link>
        </nav>
      </header>
    </div>
  );
}
