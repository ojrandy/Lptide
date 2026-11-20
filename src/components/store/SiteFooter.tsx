import { Mail, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getSettings } from "@/lib/queries/settings";

// Columns and copy as on the live footer (/api/admin/public/footer).
const QUICK_LINKS = [
  { href: "/about/", label: "About" },
  { href: "/catalog/", label: "Buy peptides" },
  { href: "/coa/", label: "COA results" },
  { href: "/help/fees/", label: "Fees" },
  { href: "/legal/terms/", label: "Terms" },
];

export async function SiteFooter() {
  const { contact } = await getSettings();
  const support = [
    ...(contact.telegram ? [{ href: contact.telegram, label: "Contact us", external: true }] : []),
    { href: "/login/", label: "Account" },
    { href: "/reconstitution-calculator/", label: "Calculator" },
    { href: "/help/faq/", label: "FAQ" },
    { href: "/help/shipping/#track-order", label: "Delivery tracking" },
  ];

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <Link href="/" className="brand footer-brand-link">
            <Image className="brand-logo" src="/brand/lppeptide-logo-center.png" alt="LPPEPTIDE" width={64} height={64} />
            <span className="brand-copy">
              <strong>LPPEPTIDE</strong>
              <small>For Research Use Only</small>
            </span>
          </Link>
          <address className="footer-contact-list">
            {contact.email && (
              <a className="footer-contact-link" href={`mailto:${contact.email}`}>
                <Mail size={16} aria-hidden="true" />
                <span>{contact.email}</span>
              </a>
            )}
            {contact.phone && (
              <a className="footer-contact-link" href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>
                <Phone size={16} aria-hidden="true" />
                <span>{contact.phone}</span>
              </a>
            )}
          </address>
          <p className="footer-notice">
            Products are supplied for research use only. Not for human consumption or clinical use. Buyers are
            responsible for following local laws; no medical advice, prescriptions, or consultations are provided.
          </p>
          <p className="footer-copyright">© 2026 LPPEPTIDE. All rights reserved.</p>
        </div>
        <nav className="footer-columns" aria-label="Footer">
          <section className="footer-column">
            <h2>Support</h2>
            {support.map((l) =>
              "external" in l ? (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">
                  {l.label}
                </a>
              ) : (
                <Link key={l.label} href={l.href}>
                  {l.label}
                </Link>
              ),
            )}
          </section>
          <section className="footer-column">
            <h2>Quick links</h2>
            {QUICK_LINKS.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </section>
        </nav>
      </div>
    </footer>
  );
}
