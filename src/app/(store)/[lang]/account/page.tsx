import { LocaleLink as Link } from "@/i18n/client";
import { Suspense } from "react";
import { AddressForm, DeleteAddressButton, ProfileForm, ResendVerification } from "@/components/store/account/AuthForms";
import { AuthShell } from "@/components/store/account/AuthShell";
import { OrderLookupPage } from "@/components/store/OrderLookupPage";
import { countryName, countryOptions } from "@/content/countries";
import { sqlite } from "@/db";
import { NUMBER_LOCALE } from "@/i18n/config";
import { localized } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import type { MessageKey } from "@/i18n/translate";
import { signOut } from "@/lib/actions/customer";
import { getCustomer, type CustomerUser } from "@/lib/customer-auth";
import { formatCents } from "@/lib/money";
import { orderPath } from "@/lib/order-token";
import { getWarehouses } from "@/lib/queries/settings";

export const generateMetadata = localized({
  title: "Account",
  description: "Your LPPEPTIDE orders, saved addresses and profile.",
  robots: { index: false },
  alternates: { canonical: "/account/" },
});

export default function Page({ searchParams }: PageProps<"/[lang]/account">) {
  return (
    <Suspense fallback={null}>
      <AccountOrLogin searchParams={searchParams} />
    </Suspense>
  );
}

/** Signed in: the account dashboard (V2-1). Signed out: the v1 login/order-lookup page, as before. */
async function AccountOrLogin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const customer = await getCustomer();
  if (!customer) return <OrderLookupPage searchParams={searchParams} />;
  return <Dashboard customer={customer} />;
}

type OrderRow = { number: string; createdAt: number; status: string; totalCents: number };
type AddressRow = {
  id: number;
  label: string;
  name: string;
  phone: string;
  country: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  isDefault: number;
};

async function Dashboard({ customer: c }: { customer: CustomerUser }) {
  const [{ t, href, locale }, warehouses] = await Promise.all([getI18n(), getWarehouses()]);
  const orders = sqlite
    .prepare("SELECT number, createdAt, status, totalCents FROM orders WHERE customerId = ? ORDER BY createdAt DESC LIMIT 100")
    .all(c.id) as unknown as OrderRow[];
  const addresses = sqlite
    .prepare("SELECT * FROM customer_addresses WHERE customerId = ? ORDER BY isDefault DESC, id DESC")
    .all(c.id) as unknown as AddressRow[];
  const affiliate = sqlite.prepare("SELECT status FROM affiliates WHERE customerId = ?").get(c.id) as { status: string } | undefined;
  const countries = countryOptions([...new Set(warehouses.flatMap((w) => w.countries))]);
  const date = (ms: number) => new Date(ms).toLocaleDateString(NUMBER_LOCALE[locale], { year: "numeric", month: "short", day: "numeric" });

  return (
    <AuthShell wide>
      <header className="lp-account-header">
        <div>
          <p className="eyebrow">{t("account.title")}</p>
          <h1>{t("account.hello", { name: c.name || c.email })}</h1>
          <p>{c.email}</p>
        </div>
        <form action={signOut}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="lp-secondary-button">
            {t("account.signOut")}
          </button>
        </form>
      </header>

      {!c.emailVerified && (
        <div className="lp-account-banner" role="status">
          <p>{t("account.verifyBanner", { email: c.email })}</p>
          <ResendVerification />
        </div>
      )}

      <section className="lp-account-card" aria-labelledby="orders-title">
        <h2 id="orders-title">{t("account.orders")}</h2>
        {orders.length === 0 ? (
          <p className="lp-muted">
            {t("account.noOrders")} <Link href={href("/catalog/")}>{t("common.continueShopping")}</Link>
          </p>
        ) : (
          <div className="lp-table-wrap">
            <table className="lp-table">
              <thead>
                <tr>
                  <th>{t("account.order")}</th>
                  <th>{t("account.date")}</th>
                  <th>{t("account.status")}</th>
                  <th className="num">{t("account.total")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.number}>
                    <td className="mono">{o.number}</td>
                    <td>{date(o.createdAt)}</td>
                    <td>{t(`order.s.${o.status}` as MessageKey)}</td>
                    <td className="num">{formatCents(o.totalCents)}</td>
                    <td>
                      <Link href={href(orderPath(o.number))}>{t("account.view")}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="lp-account-grid">
        <section className="lp-account-card" aria-labelledby="addresses-title">
          <h2 id="addresses-title">{t("account.addresses")}</h2>
          {addresses.length === 0 && <p className="lp-muted">{t("account.noAddresses")}</p>}
          <ul className="lp-address-list">
            {addresses.map((a) => (
              <li key={a.id}>
                <p>
                  {a.label && <strong>{a.label} · </strong>}
                  {a.isDefault ? <span className="lp-pill">{t("account.default")}</span> : null}
                  <br />
                  {[a.name, a.addressLine1, a.addressLine2, [a.postalCode, a.city, a.region].filter(Boolean).join(" "), countryName(a.country), a.phone]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <div className="lp-address-actions">
                  <details>
                    <summary>{t("common.edit")}</summary>
                    <AddressForm value={{ ...a, isDefault: !!a.isDefault }} countries={countries} />
                  </details>
                  <DeleteAddressButton id={a.id} />
                </div>
              </li>
            ))}
          </ul>
          {addresses.length < 10 && (
            <details className="lp-add-address">
              <summary>{t("account.addAddress")}</summary>
              <AddressForm
                value={{ id: null, label: "", name: c.name, phone: "", country: "", addressLine1: "", addressLine2: "", city: "", region: "", postalCode: "", isDefault: addresses.length === 0 }}
                countries={countries}
              />
            </details>
          )}
        </section>

        <div className="lp-account-side">
          <section className="lp-account-card" aria-labelledby="profile-title">
            <h2 id="profile-title">{t("account.profile")}</h2>
            <ProfileForm name={c.name} hasPassword={c.hasPassword} />
          </section>
          <section className="lp-account-card" aria-labelledby="affiliate-title">
            <h2 id="affiliate-title">{t("account.affiliate")}</h2>
            <p className="lp-muted">{t("account.affiliateCta")}</p>
            <Link className="lp-secondary-button" href={href("/account/affiliate/")}>
              {affiliate ? t("account.affiliateOpen") : t("affiliate.applyTitle")}
            </Link>
          </section>
        </div>
      </div>
    </AuthShell>
  );
}
