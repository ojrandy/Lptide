import { LocaleLink as Link } from "@/i18n/client";
import { Suspense } from "react";
import { CheckoutForm, type SavedAddress } from "@/components/store/cart/CheckoutForm";
import { sqlite } from "@/db";
import { localized } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import { getCustomer } from "@/lib/customer-auth";
import { getSettings } from "@/lib/queries/settings";
import "@/styles/live/cart.css";

export const generateMetadata = localized({
  title: "Checkout",
  description: "Enter your delivery details to place your LPPEPTIDE order.",
  robots: { index: false },
  alternates: { canonical: "/checkout/" },
});

export default async function CheckoutPage() {
  const { t, href } = await getI18n();
  return (
    <div className="site-shell">
      <main className="cart-page">
        <nav className="cart-breadcrumb" aria-label={t("checkout.breadcrumb")}>
          <Link href={href("/catalog/")}>{t("common.home")}</Link>
          {/* Live CSS draws the ">" separator before spans only (.cart-breadcrumb span:before). */}
          <span>
            <Link href={href("/cart/")}>{t("common.cart")}</Link>
          </span>
          <span>{t("checkout.title")}</span>
        </nav>
        <Suspense
          fallback={
            <>
              <header className="cart-heading">
                <h1>{t("checkout.title")}</h1>
                <p>{t("checkout.intro")}</p>
              </header>
              <div className="cart-empty">
                <h2>{t("cart.loading")}</h2>
              </div>
            </>
          }
        >
          <CheckoutBody />
        </Suspense>
      </main>
    </div>
  );
}

/** Reads the session (cookies), so it renders per request inside <Suspense>. */
async function CheckoutBody() {
  const [{ t }, settings, customer] = await Promise.all([getI18n(), getSettings(), getCustomer()]);
  const addresses = customer
    ? (sqlite
        .prepare(
          `SELECT id, label, name, phone, country, addressLine1, addressLine2, city, region, postalCode, isDefault
             FROM customer_addresses WHERE customerId = ? ORDER BY isDefault DESC, id DESC`,
        )
        .all(customer.id) as unknown as (Omit<SavedAddress, "isDefault"> & { isDefault: number })[])
    : [];
  return (
    <>
      <header className="cart-heading">
        <h1>{t("checkout.title")}</h1>
        <p>{customer ? t("checkout.introAccount", { email: customer.email }) : t("checkout.intro")}</p>
      </header>
      <CheckoutForm
        paymentNote={settings.checkout.paymentNote}
        methods={settings.paymentMethods.filter((m) => m.enabled).map((m) => ({ id: m.id, label: m.label }))}
        account={customer ? { email: customer.email, name: customer.name } : null}
        addresses={addresses.map((a) => ({ ...a, isDefault: !!a.isDefault }))}
      />
    </>
  );
}
