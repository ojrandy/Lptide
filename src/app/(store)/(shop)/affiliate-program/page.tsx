import type { Metadata } from "next";
import Link from "next/link";
import "@/styles/live/affiliate.css";

// Copy verbatim from the live page. The program itself (applications, links, commissions) is v2 (docs/01),
// so the call to action goes to the contact page instead of the live /referrals dashboard.

export const metadata: Metadata = {
  title: "Affiliate Program",
  description: "Learn how LPPEPTIDE affiliate commissions, eligibility, and withdrawals work.",
  alternates: { canonical: "/affiliate-program/" },
};

const FACTS = [
  { label: "Qualification", value: "$3,000.00", note: "Cumulative valid order value required to apply" },
  { label: "Commission", value: "10%", note: "Calculated from net product value only" },
  { label: "Hold period", value: "30 days", note: "Completed order commission remains frozen first" },
  { label: "Withdrawal", value: "3 / month", note: "Minimum $100.00" },
];

export default function AffiliateProgramPage() {
  return (
    <div className="site-shell">
      <main className="affiliate-program-page">
        <section className="program-intro">
          <span>Referral affiliate program</span>
          <h1>Earn 10% from every eligible referral order.</h1>
          <p>
            Qualified customers can share a personal link, earn from the customers they bring to the store, and use available
            commission as controlled checkout credit. Withdrawal availability is shown separately.
          </p>
          <Link href="/contact/">Contact us to apply</Link>
        </section>
        <section className="program-facts" aria-label="Program facts">
          {FACTS.map((f) => (
            <article key={f.label}>
              <span>{f.label}</span>
              <strong>{f.value}</strong>
              <small>{f.note}</small>
            </article>
          ))}
        </section>
        <section className="program-rules">
          <div>
            <h2>How the program works</h2>
            <ol>
              <li>Reach the qualifying cumulative order value, then submit a free affiliate application.</li>
              <li>After approval, share the personal link or code with new customers.</li>
              <li>A completed referred order creates a commission record using the rate active at completion.</li>
              <li>
                After the configured hold period, commission becomes available for controlled checkout credit. Withdrawal
                availability is shown separately.
              </li>
            </ol>
          </div>
          <div>
            <h2>Important controls</h2>
            <ul>
              <li>Refunded or disputed referred orders void the related commission immediately.</li>
              <li>
                Using affiliate commission credit disables all coupons, campaigns, member pricing, and customer-service discounts for
                that order.
              </li>
              <li>
                Customer support handles account questions through a dedicated case conversation. Financial review and payment
                records remain internal.
              </li>
              <li>Withdrawal availability, supported payout assets, and networks are shown only when approved and enabled.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
