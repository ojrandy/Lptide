import { CircleUser, ShoppingCart } from "lucide-react";
import Image from "next/image";
import { LocaleLink as Link } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import { getWarehouses } from "@/lib/queries/settings";
import { CartCount } from "./cart-widgets";
import { MobileMenu } from "./MobileMenu";
import { SearchDialog } from "./SearchDialog";

/** Home page floating pill header (live classes: landing-header, primary-nav, header-utilities). */
export async function LandingHeader() {
  const { t, href } = await getI18n();
  const warehouses = (await getWarehouses()).map((w) => ({ code: w.code, name: w.name, tagline: w.tagline }));

  return (
    <header className="landing-header">
      <nav className="mobile-header-controls" aria-label={t("nav.mobile")}>
        <MobileMenu warehouses={warehouses} buttonClassName="header-icon-button" />
        <SearchDialog variant="landing" buttonClassName="header-icon-button" />
      </nav>
      <Link href={href("/")} className="landing-brand" aria-label={t("common.brandHome")}>
        <Image src="/brand/lppeptide-logo-center.png" alt="LPPEPTIDE" width={44} height={44} loading="eager" />
        <strong>LPPEPTIDE</strong>
      </Link>
      <nav className="primary-nav" aria-label={t("nav.primary")}>
        {warehouses.map((w) => (
          <Link key={w.code} href={href(`/warehouse/${w.code.toLowerCase()}/`)} className="warehouse-nav-link">
            <span>{w.name}</span>
            <small>{w.tagline}</small>
          </Link>
        ))}
        <Link href={href("/affiliate-program/")}>{t("nav.affiliate")}</Link>
        <Link href={href("/coa/")}>{t("nav.coa")}</Link>
      </nav>
      <nav className="header-utilities" aria-label={t("nav.accountAndCart")}>
        <SearchDialog variant="landing" buttonClassName="header-icon-button desktop-search-button" />
        <Link href={href("/login/")} className="header-icon-button" aria-label={t("common.account")}>
          <CircleUser size={22} aria-hidden="true" />
        </Link>
        <Link href={href("/cart/")} className="header-icon-button cart-icon-button" aria-label={t("common.cart")}>
          <ShoppingCart size={22} aria-hidden="true" />
          <CartCount hideWhenEmpty />
        </Link>
      </nav>
    </header>
  );
}
