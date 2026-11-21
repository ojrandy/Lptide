import { LocaleLink as Link } from "@/i18n/client";
import type { ReactNode } from "react";
import { getSettings } from "@/lib/queries/settings";
import { NavLink } from "../ContextNav";
import "@/styles/live/calculator.css";

// Shared frame of the live research tools: /reconstitution-calculator/, /cost-per-dose-calculator/,
// /vial-duration-calculator/, /product-lookup/ (each its own URL on the live site).

const TABS = [
  { href: "/reconstitution-calculator/", label: "Reconstitution" },
  { href: "/cost-per-dose-calculator/", label: "Cost per Dose" },
  { href: "/vial-duration-calculator/", label: "Vial Duration" },
  { href: "/product-lookup/", label: "Product Lookup" },
  { href: "/contact/", label: "Contact" },
];

export async function CalculatorShell({
  title,
  intro,
  children,
  after,
}: {
  title: string;
  intro: string;
  children: ReactNode;
  after?: ReactNode;
}) {
  const { contact } = await getSettings();
  return (
    <div className="site-shell calculator-shell">
      <main className="calculator-page">
        <section className="calculator-hero">
          <div className="calculator-hero-copy">
            <p className="calculator-kicker">Research calculation tools</p>
            <h1>{title}</h1>
            <p>{intro}</p>
            <div className="calculator-hero-actions" aria-label="WhatsApp contact action">
              {contact.whatsapp ? (
                <a href={contact.whatsapp} target="_blank" rel="noopener noreferrer" className="calculator-action primary">
                  WhatsApp
                </a>
              ) : (
                <Link href="/contact/?channel=whatsapp" className="calculator-action primary">
                  WhatsApp
                </Link>
              )}
            </div>
          </div>
        </section>
        <div className="calculator-tool-layout">
          <nav className="calculator-tabs" aria-label="Research calculator pages">
            {TABS.map((t) => (
              <NavLink key={t.href} href={t.href} activeClassName="active">
                {t.label}
              </NavLink>
            ))}
          </nav>
          <section className="calculator-workspace" aria-live="polite">
            {children}
          </section>
        </div>
        {after}
        <section className="research-disclaimer">
          <strong>Research-use disclaimer</strong>
          <p>
            This calculator is provided for research-use planning only. It does not provide medical advice, treatment guidance, or
            human-use instructions. Product availability, COA status, and pricing should be confirmed with sales before ordering.
          </p>
        </section>
      </main>
    </div>
  );
}
