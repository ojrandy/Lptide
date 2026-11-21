import { LocaleLink as Link } from "@/i18n/client";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AffiliateApplyForm, CopyLink } from "@/components/store/account/AffiliateForms";
import { AuthShell } from "@/components/store/account/AuthShell";
import { sqlite } from "@/db";
import { NUMBER_LOCALE } from "@/i18n/config";
import { localized } from "@/i18n/metadata";
import { getI18n } from "@/i18n/server";
import type { MessageKey } from "@/i18n/translate";
import { affiliateStats, paidOrderValueCents } from "@/lib/affiliate";
import { getCustomer } from "@/lib/customer-auth";
import { formatCents } from "@/lib/money";
import { getSettings } from "@/lib/queries/settings";

// /account/affiliate/ — apply (form) or the affiliate dashboard (V2-4).

export const generateMetadata = localized({
  title: "Affiliate dashboard",
  robots: { index: false },
  alternates: { canonical: "/account/affiliate/" },
});

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Body />
    </Suspense>
  );
}

type Affiliate = { id: number; code: string; status: string; commissionPercent: number; createdAt: number };

async function Body() {
  const [{ t, href, locale }, c, settings] = await Promise.all([getI18n(), getCustomer(), getSettings()]);
  if (!c) redirect(href(`/login/?next=${encodeURIComponent(href("/account/affiliate/"))}`));
  const rules = settings.affiliate;
  const a = sqlite.prepare("SELECT id, code, status, commissionPercent, createdAt FROM affiliates WHERE customerId = ?").get(c.id) as Affiliate | undefined;
  const date = (ms: number) => new Date(ms).toLocaleDateString(NUMBER_LOCALE[locale], { year: "numeric", month: "short", day: "numeric" });

  const header = (
    <header className="lp-account-header">
      <div>
        <p className="eyebrow">
          <Link href={href("/account/")}>{t("account.title")}</Link>
        </p>
        <h1>{t("affiliate.title")}</h1>
      </div>
    </header>
  );

  if (!a) {
    const current = paidOrderValueCents(c.id);
    const qualified = current >= rules.qualificationCents;
    return (
      <AuthShell wide>
        {header}
        <section className="lp-account-card">
          <h2>{t("affiliate.applyTitle")}</h2>
          <p className="lp-muted">{t("affiliate.applyIntro")}</p>
          <p className="lp-muted">{t("affiliate.rate", { percent: rules.commissionPercent })}</p>
          {!c.emailVerified ? (
            <p className="lp-form-error">{t("affiliate.verifyFirst")}</p>
          ) : !qualified ? (
            <p className="lp-account-banner">{t("affiliate.qualify", { amount: formatCents(rules.qualificationCents), current: formatCents(current) })}</p>
          ) : (
            <AffiliateApplyForm />
          )}
        </section>
      </AuthShell>
    );
  }

  if (a.status !== "APPROVED")
    return (
      <AuthShell wide>
        {header}
        <section className="lp-account-card">
          <p>
            {a.status === "PENDING"
              ? t("affiliate.pending", { date: date(a.createdAt) })
              : a.status === "REJECTED"
                ? t("affiliate.rejected")
                : t("affiliate.suspended")}
          </p>
        </section>
      </AuthShell>
    );

  const site = process.env.SITE_URL ?? "https://lppeptide.co";
  const stats = affiliateStats(a.id, rules.holdDays);
  const commissions = sqlite
    .prepare(
      `SELECT o.number, c.baseCents, c.amountCents, c.status, c.createdAt FROM affiliate_commissions c JOIN orders o ON o.id = c.orderId
        WHERE c.affiliateId = ? ORDER BY c.createdAt DESC LIMIT 100`,
    )
    .all(a.id) as { number: string; baseCents: number; amountCents: number; status: string; createdAt: number }[];
  const payouts = sqlite
    .prepare("SELECT amountCents, method, reference, createdAt FROM affiliate_payouts WHERE affiliateId = ? ORDER BY createdAt DESC LIMIT 50")
    .all(a.id) as { amountCents: number; method: string; reference: string; createdAt: number }[];
  // Order numbers are shown masked: the affiliate sees that an order exists, not whose it is.
  const mask = (n: string) => `${n.slice(0, 8)}••••`;

  return (
    <AuthShell wide>
      {header}
      <section className="lp-account-card">
        <h2>{t("affiliate.link")}</h2>
        <CopyLink value={`${site}${locale === "en" ? "" : `/${locale}`}/?ref=${a.code}`} />
        <p className="lp-muted">
          {t("affiliate.code")}: <strong className="mono">{a.code}</strong> · {t("affiliate.cookie")}
        </p>
        <p className="lp-muted">{t("affiliate.rate", { percent: a.commissionPercent })}</p>
      </section>
      <div className="lp-stat-grid">
        <div className="lp-stat">
          <span>{t("affiliate.clicks")}</span>
          <strong>{stats.clicks}</strong>
          <small>{t("affiliate.clicks30", { count: stats.clicks30d })}</small>
        </div>
        <div className="lp-stat">
          <span>{t("affiliate.ordersReferred")}</span>
          <strong>{stats.orders}</strong>
          <small>{t("affiliate.paidOrders", { count: stats.paidOrders })}</small>
        </div>
        <div className="lp-stat">
          <span>{t("affiliate.earned")}</span>
          <strong>{formatCents(stats.earnedCents)}</strong>
          <small>
            {t("affiliate.onHold", { days: rules.holdDays })}: {formatCents(stats.onHoldCents)}
          </small>
        </div>
        <div className="lp-stat">
          <span>{t("affiliate.due")}</span>
          <strong>{formatCents(stats.payableCents)}</strong>
          <small>
            {t("affiliate.paidOut")}: {formatCents(stats.paidOutCents)}
          </small>
        </div>
      </div>
      <div className="lp-account-grid">
        <section className="lp-account-card">
          <h2>{t("affiliate.commissions")}</h2>
          {commissions.length === 0 ? (
            <p className="lp-muted">{t("affiliate.none")}</p>
          ) : (
            <div className="lp-table-wrap">
              <table className="lp-table">
                <thead>
                  <tr>
                    <th>{t("affiliate.order")}</th>
                    <th>{t("account.date")}</th>
                    <th className="num">{t("affiliate.base")}</th>
                    <th className="num">{t("affiliate.amount")}</th>
                    <th>{t("account.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((x) => (
                    <tr key={x.number}>
                      <td className="mono">{mask(x.number)}</td>
                      <td>{date(x.createdAt)}</td>
                      <td className="num">{formatCents(x.baseCents)}</td>
                      <td className="num">{formatCents(x.amountCents)}</td>
                      <td>{t(`affiliate.cs.${x.status}` as MessageKey)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="lp-account-card">
          <h2>{t("affiliate.payouts")}</h2>
          {payouts.length === 0 ? (
            <p className="lp-muted">{t("affiliate.none")}</p>
          ) : (
            <ul className="lp-address-list">
              {payouts.map((p, i) => (
                <li key={i}>
                  <p>
                    <strong>{formatCents(p.amountCents)}</strong> · {date(p.createdAt)}
                    <br />
                    {[p.method, p.reference].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AuthShell>
  );
}
