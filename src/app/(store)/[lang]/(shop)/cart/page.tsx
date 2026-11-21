import { localized } from "@/i18n/metadata";
import { LocaleLink as Link } from "@/i18n/client";
import { CartView } from "@/components/store/cart/CartView";
import { getI18n } from "@/i18n/server";
import { getSettings } from "@/lib/queries/settings";
import "@/styles/live/cart.css";

export const generateMetadata = localized({
  title: "Your cart",
  description: "Review your LPPEPTIDE cart, adjust quantities, and continue to checkout.",
  robots: { index: false },
  alternates: { canonical: "/cart/" },
});

export default async function CartPage() {
  const [{ checkout }, { t, href }] = await Promise.all([getSettings(), getI18n()]);
  return (
    <div className="site-shell">
      <main className="cart-page">
        <nav className="cart-breadcrumb" aria-label={t("checkout.breadcrumb")}>
          <Link href={href("/catalog/")}>{t("common.home")}</Link>
          <span>{t("common.cart")}</span>
        </nav>
        <CartView paymentNote={checkout.paymentNote} minimumOrderCents={checkout.minimumOrderCents} />
      </main>
    </div>
  );
}
