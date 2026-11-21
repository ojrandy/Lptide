import { CircleUser, ShoppingCart } from "lucide-react";
import Image from "next/image";
import { LocaleLink as Link } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import { getWarehouses } from "@/lib/queries/settings";
import { AnnouncementBar } from "./AnnouncementBar";
import { CartCount } from "./cart-widgets";
import { ContextMenu, NavLink } from "./ContextNav";
import { SearchDialog } from "./SearchDialog";

/** Header for every page except home (live classes: storefront-context-*). */
export async function ContextHeader() {
  const { t, href } = await getI18n();
  const warehouses = (await getWarehouses()).map((w) => ({
    code: w.code,
    name: w.name,
    tagline: w.tagline,
    href: href(`/warehouse/${w.code.toLowerCase()}/`),
  }));

  return (
    <div className="storefront-context-header">
      <AnnouncementBar variant="context" />
      <header className="storefront-context-main">
        <ContextMenu warehouses={warehouses} />
        <Link href={href("/")} className="storefront-context-brand" aria-label={t("common.brandHome")}>
          <Image src="/brand/lppeptide-logo-center.png" alt="LPPEPTIDE" width={38} height={38} priority />
          <strong>LPPEPTIDE</strong>
        </Link>
        <nav className="storefront-context-primary" aria-label={t("nav.warehouseNav")}>
          {warehouses.map((w) => (
            <NavLink key={w.code} href={w.href} className="storefront-context-warehouse-link">
              <span>{w.name}</span>
              <small>{w.tagline}</small>
            </NavLink>
          ))}
          <NavLink href={href("/affiliate-program/")}>{t("nav.affiliate")}</NavLink>
          <NavLink href={href("/coa/")}>{t("nav.coa")}</NavLink>
        </nav>
        <nav className="storefront-context-tools" aria-label={t("nav.accountTools")}>
          <SearchDialog variant="context" />
          <Link href={href("/login/")} aria-label={t("common.signIn")}>
            <CircleUser size={22} aria-hidden="true" />
          </Link>
          <Link href={href("/cart/")} className="storefront-context-cart" aria-label={t("common.shoppingCart")}>
            <ShoppingCart size={22} aria-hidden="true" />
            <CartCount hideWhenEmpty />
          </Link>
        </nav>
      </header>
    </div>
  );
}
