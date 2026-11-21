import { Mail, MessageCircle, Phone, Send } from "lucide-react";
import Image from "next/image";
import { LocaleLink as Link } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import type { MessageKey } from "@/i18n/translate";
import { getSettings } from "@/lib/queries/settings";
import { LanguageSwitcher } from "./LanguageSwitcher";

// Columns and copy as on the live footer (/api/admin/public/footer). v2: labels translated, language switcher.
const QUICK_LINKS: { href: string; label: MessageKey }[] = [
  { href: "/about/", label: "footer.about" },
  { href: "/catalog/", label: "footer.buy" },
  { href: "/coa/", label: "footer.coaResults" },
  { href: "/help/fees/", label: "footer.fees" },
  { href: "/legal/terms/", label: "footer.terms" },
];

export async function SiteFooter() {
  const [{ contact }, { t, href }] = await Promise.all([getSettings(), getI18n()]);
  const support: { href: string; label: string; external?: boolean }[] = [
    ...(contact.telegram ? [{ href: contact.telegram, label: t("footer.contactUs"), external: true }] : []),
    { href: href("/login/"), label: t("common.account") },
    { href: href("/reconstitution-calculator/"), label: t("nav.calculator") },
    { href: href("/help/faq/"), label: t("footer.faq") },
    { href: href("/help/shipping/#track-order"), label: t("footer.tracking") },
  ];

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <Link href={href("/")} className="brand footer-brand-link">
            <Image className="brand-logo" src="/brand/lppeptide-logo-center.png" alt="LPPEPTIDE" width={64} height={64} />
            <span className="brand-copy">
              <strong>LPPEPTIDE</strong>
              <small>{t("footer.ruo")}</small>
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
            {contact.telegram && (
              <a className="footer-contact-link" href={contact.telegram} target="_blank" rel="noopener noreferrer">
                <Send size={16} aria-hidden="true" />
                <span>Telegram</span>
              </a>
            )}
            {contact.whatsapp && (
              <a className="footer-contact-link" href={contact.whatsapp} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={16} aria-hidden="true" />
                <span>WhatsApp</span>
              </a>
            )}
          </address>
          <p className="footer-notice">{t("footer.notice")}</p>
          <p className="footer-copyright">{t("footer.copyright")}</p>
          <LanguageSwitcher />
        </div>
        <nav className="footer-columns" aria-label={t("footer.label")}>
          <section className="footer-column">
            <h2>{t("footer.support")}</h2>
            {support.map((l) =>
              l.external ? (
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
            <h2>{t("footer.quickLinks")}</h2>
            {QUICK_LINKS.map((l) => (
              <Link key={l.href} href={href(l.href)}>
                {t(l.label)}
              </Link>
            ))}
          </section>
        </nav>
      </div>
    </footer>
  );
}
